# RaceProof 🛡️ — Race-Proof Team Formation at Scale

> **Hack4Hack Crew Hiring Challenge 2026 — Problem Statement 1 (PS1)**  
> Production-grade, ACID-compliant team formation platform engineered to support **10,000 hackathon participants** with **zero race conditions**, sub-100ms discovery latency, and automated lifecycle management.  
>  
> 🌐 **Live Vercel Production URL:** [https://frontend-ivory-one-93.vercel.app](https://frontend-ivory-one-93.vercel.app)

[![CI Status](https://github.com/namangoyal176-10/ps1/actions/workflows/ci.yml/badge.svg)](https://github.com/namangoyal176-10/ps1/actions)
[![Live on Vercel](https://img.shields.io/badge/Vercel-Live_Deployment-black.svg?logo=vercel)](https://frontend-ivory-one-93.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16-blue.svg)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Runtime-Node.js_v22-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-cyan.svg)](https://react.dev/)

---

## 📑 Table of Contents
1. [Executive Summary](#-executive-summary)
2. [Architecture Overview](#-architecture-overview)
3. [Critical Concurrency: The 50:1 Race Solution](#-critical-concurrency-the-501-race-solution)
4. [Key Features & Capabilities](#-key-features--capabilities)
5. [Load Testing & Benchmark Results](#-load-testing--benchmark-results)
6. [Technology Stack](#-technology-stack)
7. [Getting Started (Local & Docker)](#-getting-started)
8. [Automated Testing Suite (36 API Tests)](#-automated-testing-suite)
9. [Large-Scale Seeding (10k Users / 2k Teams)](#-large-scale-seeding)
10. [API Reference Specification](#-api-reference-specification)
11. [Deployment Guide](#-deployment-guide)

---

## 🎯 Executive Summary

In large hackathons with thousands of participants, high-demand teams with 1 open seat often trigger intense concurrency spikes. Traditional read-then-write logic creates severe race conditions:
- **Overcapacity violations**: 5 or 6 members end up in a 4-seat team.
- **Ghost & duplicate memberships**: Users assigned to multiple teams simultaneously.
- **Corrupted states**: Unsynchronized counts, broken invite usage limits, and orphaned join requests.

**RaceProof** guarantees mathematical consistency under arbitrary concurrency spikes using **PostgreSQL row-level locking (`SELECT ... FOR UPDATE`)**, interactive database transactions, automated idempotency key caching, and real-time Socket.IO synchronization.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    Client["React 18 + Vite SPA\n(TanStack Query + Tailwind CSS)"]
    SocketClient["Socket.IO Client\n(Real-time room sync)"]
    
    subgraph Gateway ["Reverse Proxy & Network Boundary"]
        Nginx["Nginx / Express Gateway"]
        IdempotencyMw["Idempotency Cache Middleware\n(X-Idempotency-Key)"]
        RateLimitMw["express-rate-limit\n(SLA Protection)"]
    end

    subgraph Backend ["Node.js + Express + TypeScript Core"]
        AuthSvc["Auth & JWT Service\n(Argon2 / bcrypt + HTTP-Only Cookie)"]
        TeamSvc["Team Service\n(Pessimistic Row-Lock Engine)"]
        MatchEngine["Recommendation Engine\n(Jaccard Skill Overlap + Timezone Decay)"]
        SocketServer["Socket.IO Server\n(team:{id}, user:{id}, discovery)"]
        AuditLogger["Immutable Audit Ledger\n(Structured Action Stream)"]
    end

    subgraph Database ["PostgreSQL 16 Engine"]
        RowLock[("Pessimistic Row Lock\nSELECT ... FOR UPDATE")]
        TeamTable[("Teams Table\n(Atomic count & status)")]
        MemberTable[("TeamMembers Table\n(UNIQUE userId constraint)")]
        InviteTable[("TeamInvites Table\n(Row-locked usedCount)")]
        AuditTable[("AuditLogs Table\n(Immutable event store)")]
    end

    Client --> Nginx
    SocketClient <--> SocketServer
    Nginx --> RateLimitMw --> IdempotencyMw --> Backend
    TeamSvc --> RowLock
    RowLock --> TeamTable
    RowLock --> MemberTable
    RowLock --> InviteTable
    TeamSvc --> AuditLogger --> AuditTable
    TeamSvc --> SocketServer
```

---

## ⚡ Critical Concurrency: The 50:1 Race Solution

### The Scenario
A team has **exactly 1 available seat** remaining (`3 / 4` members occupied). **Fifty (50) different users attempt to join or be accepted simultaneously**.

### The Vulnerability in Standard Architectures
Naive architectures execute:
```sql
-- DANGEROUS READ-THEN-WRITE
SELECT count(*) FROM "TeamMember" WHERE "teamId" = $1; -- All 50 read count = 3
-- All 50 pass the check (3 < 4)
INSERT INTO "TeamMember" ("teamId", "userId") VALUES ($1, $2);
-- RESULT: Team now has 53 members! Capacity violated!
```

### RaceProof's Pessimistic Row Lock Solution
RaceProof executes the join inside an isolated PostgreSQL transaction using **exclusive row locking**:

```typescript
return await prisma.$transaction(async (tx) => {
  // 1. Acquire exclusive lock on the Team row
  const [lockedTeam] = await tx.$queryRaw`
    SELECT id, name, "maxMembers", status
    FROM "Team"
    WHERE id = ${teamId}
    FOR UPDATE; -- Blocks all concurrent transactions for this team
  `;

  // 2. Query accurate current member count inside the lock
  const currentCount = await tx.teamMember.count({ where: { teamId } });

  // 3. Strict barrier: reject immediately if seat is occupied
  if (currentCount >= lockedTeam.maxMembers) {
    await tx.team.update({
      where: { id: teamId },
      data: { status: 'FULL' },
    });
    throw new AppError(409, `Team is already full (${currentCount}/${lockedTeam.maxMembers})`);
  }

  // 4. Verify user is not already committed to another team
  const existing = await tx.teamMember.findUnique({ where: { userId } });
  if (existing) {
    throw new AppError(409, 'User already belongs to an active team');
  }

  // 5. Insert new member atomically
  const member = await tx.teamMember.create({
    data: { teamId, userId, role: 'MEMBER' },
  });

  // 6. Transition team status if capacity reached
  if (currentCount + 1 >= lockedTeam.maxMembers) {
    await tx.team.update({
      where: { id: teamId },
      data: { status: 'FULL' },
    });
    // Auto-decline other pending join requests
    await tx.joinRequest.updateMany({
      where: { teamId, status: 'PENDING' },
      data: { status: 'DECLINED' },
    });
  }

  // 7. Write immutable audit log
  await logAudit({ teamId, actorId: userId, action: 'MEMBER_JOINED', tx });

  return { member, newCount: currentCount + 1 };
}, { timeout: 15000 });
```

### Concurrency Test Outcome
In automated Vitest concurrency testing (`tests/concurrency.test.ts`):
- **Successful 200/201 joins**: **Exactly 1**
- **Rejected 409 Conflict joins**: **Exactly 49**
- **Overcapacity errors**: **0**
- **Duplicate memberships**: **0**
- **Execution duration**: **466 ms total**

---

## 🚀 Key Features & Capabilities

### 1. High-Performance Discovery Board
- Full-text search by team name, idea description, and required tech stack.
- Filter by track, open seats status, and skills.
- Sub-100ms response time with database indexes on `status`, `track`, and `skillsNeeded`.

### 2. Autonomous Team Lifecycle Management
- **Automatic Leadership Delegation**: When a team leader leaves, leadership is automatically transferred to the next senior member (earliest `joinedAt`).
- **Autonomous Self-Deletion**: When the final member departs, the team and orphaned invitation codes are deleted cleanly from the database.
- **Leadership Role Delegation**: Team leaders can explicitly transfer leadership or remove members.

### 3. Cryptographically Secure Invitation Codes
- Random 8-character URL-safe invitation codes generated using `crypto.randomBytes`.
- Configurable maximum usages (1 to 100) and expiration TTL (24h to 30 days).
- Row-level locked usage incrementation prevents over-redemption.
- Instant leader revocation support.

### 4. Intelligent Teammate & Squad Matching Engine
Calculates ranked matches for both teams and solo participants:
- **Skill Overlap Score ($S_{skill}$)**: Jaccard overlap between candidate skills and team's sought skills.
- **Timezone Proximity Score ($S_{tz}$)**: Linear decay based on UTC offset difference:
  $$\Delta TZ = |TZ_{team} - TZ_{candidate}|$$
  $$S_{tz} = \max(0, 1 - \frac{\Delta TZ}{12})$$
- **Composite Match Score**:
  $$Score = (S_{skill} \times 0.70) + (S_{tz} \times 0.30)$$

### 5. Automatic Idempotency Key Caching
- Any mutating request sending `Idempotency-Key` or `X-Idempotency-Key` is tracked in the `IdempotencyRecord` table.
- Retries return cached responses with header `X-Cache-Lookup: HIT`, preventing duplicate teams or multiple memberships.

### 6. Real-Time Socket.IO Synchronization
- Dynamic rooms: `team:{id}`, `user:{id}`, and `discovery`.
- Instant TanStack Query cache invalidation upon team creation, member departure, or join request decisions.

---

## 📊 Load Testing & Benchmark Results

We benchmarked the team discovery endpoint using **Autocannon** under **100 concurrent users** for 10 seconds against a dataset of **10,000 users and 2,000 teams**.

### Actual Measured Metrics:
| Metric | Benchmark Result | Requirement SLA | Result |
| :--- | :--- | :--- | :--- |
| **Concurrent Users** | **100 concurrent connections** | 100 | ✅ Achieved |
| **p95 Latency** | **95.0 ms** | < 200 ms | ✅ **2.1x Faster** |
| **Average Latency** | **55.5 ms** | - | ⚡ Ultra-fast |
| **p50 Latency** | **52.0 ms** | - | ⚡ Instant |
| **p90 Latency** | **68.0 ms** | - | ⚡ Snappy |
| **p99 Latency** | **177.0 ms** | < 500 ms | ✅ Reliable |
| **Throughput** | **1,787.60 req/sec (23.54 MB/s)**| - | 🚀 High Throughput |
| **Total Requests in 10s** | **17,876 requests** | - | 🚀 100% Handled |
| **Error Rate (non-2xx)** | **0% (0 errors)** | < 1% | ✅ Zero Errors |

*The complete benchmark report is persisted in [`BENCHMARK_REPORT.json`](./BENCHMARK_REPORT.json).*

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router v6, TanStack Query, Lucide Icons |
| **Backend** | Node.js v22, Express.js, TypeScript, Prisma ORM, Socket.IO, Helmet, Zod |
| **Database** | PostgreSQL 16 (Row-Level Locking, ACID Transactions, Native Array Columns) |
| **Security** | JWT, HTTP-Only Cookies, bcrypt, Rate Limiting, Idempotency Middleware |
| **Testing** | Vitest, Supertest, Automated 50-User Concurrency Test |
| **Benchmarking** | Autocannon, k6 (`load-test.js`) |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI, Render, Vercel |

---

## 🏁 Getting Started

### Prerequisites
- Node.js >= 20.x (v22 recommended)
- PostgreSQL >= 15.x
- npm >= 9.x

### 1. Clone & Install
```bash
git clone https://github.com/namangoyal176-10/ps1.git
cd ps1

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
cd ..
```

### 2. Environment Configuration
Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/raceproof?schema=public"
JWT_SECRET="raceproof_super_secret_jwt_key_hack4hack_2026_production_grade"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
COOKIE_SECURE="false"
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=500
```

### 3. Initialize Database & Seed
```bash
cd backend
# Sync Prisma schema to PostgreSQL
npx prisma db push
npx prisma generate

# Seed demo users and starter teams
npm run db:seed
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend API (port 5000)
cd backend && npm run dev

# Terminal 2: Frontend SPA (port 5173)
cd frontend && npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🐳 Docker Compose Quickstart

Run the complete multi-tier stack with a single command:
```bash
docker compose up --build
```
- **Frontend**: `http://localhost:80`
- **Backend API**: `http://localhost:5000`
- **PostgreSQL**: `localhost:5432`

---

## 🧪 Automated Testing Suite

RaceProof includes **36 automated API and concurrency tests** covering all platform operations:

```bash
cd backend
npm test
```

### Concurrency Test Command
Run the isolated 50-user simultaneous race test:
```bash
npm run test:concurrency
```

### Test Coverage Breakdown:
| Test Suite | Tests | Description |
| :--- | :---: | :--- |
| `tests/concurrency.test.ts` | **2** | **50 concurrent users race for 1 seat; verifies exactly 1 join & 49 rejections** |
| `tests/auth.test.ts` | **10** | Register, duplicate checks, login, JWT cookies, profile updates |
| `tests/team.test.ts` | **8** | Team creation, single-team constraint, track filters, search |
| `tests/joinRequest.test.ts`| **5** | Send request, duplicate prevention, leader accept/decline, cancel |
| `tests/invite.test.ts` | **4** | Secure code generation, TTL validation, usage limits, revocation |
| `tests/lifecycle.test.ts` | **4** | Automatic leadership succession, auto-deletion on empty, kicking |
| `tests/recommendation.test.ts`| **2** | Jaccard skill similarity & timezone proximity ranking |
| `tests/idempotency.test.ts` | **1** | Idempotency key replay and duplicate mutation suppression |
| **Total** | **36** | **All 36 Tests Passing in CI** |

---

## 👥 Large-Scale Seeding (10,000 Users / 2,000 Teams)

To test true hackathon scale, run the ultra-fast bulk seeder:
```bash
cd backend
npm run db:seed:large
```
**Benchmark Seeding Performance**:
- Generates 10,000 user profiles, 2,000 teams, and 5,000 memberships.
- Completes in **1.13 seconds** using chunked batch insertions (`createMany`).

### Pre-Seeded Evaluator Accounts
| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Team Leader** | `leader@raceproof.dev` | `Password123!` | Leader of *CyberGuardians* (3/4 seats occupied) |
| **Solo Participant** | `solo@raceproof.dev` | `Password123!` | Looking for team, ready to test joins |
| **Starter Invite Code** | `RACE2026` | - | Valid invite for *CyberGuardians* |

---

## ⚡ Performance Load Testing

Run the Autocannon load benchmark:
```bash
cd backend
npm run benchmark
```

Or run the k6 script:
```bash
k6 run load-test.js
```

---

## 📡 API Reference Specification

### Authentication
- `POST /api/v1/auth/register` — Register new participant
- `POST /api/v1/auth/login` — Sign in and receive JWT + HTTP-only cookie
- `POST /api/v1/auth/logout` — Clear session
- `GET /api/v1/auth/me` — Get authenticated user details & team membership
- `PATCH /api/v1/auth/profile` — Update skills, bio, timezone, and availability

### Teams & Memberships
- `GET /api/v1/teams` — Discover teams (query: `search`, `track`, `hasOpenSpots`, `page`, `limit`)
- `POST /api/v1/teams` — Create new team (supports `Idempotency-Key`)
- `GET /api/v1/teams/:id` — Detailed team view with roster and leader actions
- `PATCH /api/v1/teams/:id` — Update team settings (leader only)
- `POST /api/v1/teams/join-with-code` — **Row-locked direct join using invite code**
- `POST /api/v1/teams/:id/leave` — Leave team (triggers auto-transfer or auto-deletion)
- `POST /api/v1/teams/:id/transfer-leadership` — Transfer leader role
- `DELETE /api/v1/teams/:id/members/:userId` — Remove member (leader only)

### Invitations & Codes
- `POST /api/v1/invites` — Generate secure invite code with expiry & max uses
- `DELETE /api/v1/invites/:id` — Revoke active invite code
- `GET /api/v1/invites/validate/:code` — Validate code and preview team details
- `GET /api/v1/invites/team/:teamId` — List all active codes for team

### Join Requests
- `POST /api/v1/join-requests` — Send join request to a team
- `POST /api/v1/join-requests/:id/accept` — **Row-locked approval by team leader**
- `POST /api/v1/join-requests/:id/decline` — Decline join request
- `DELETE /api/v1/join-requests/:id` — Cancel sent join request
- `GET /api/v1/join-requests/my-requests` — Get user's outgoing applications

### Recommendations & Audit
- `GET /api/v1/recommendations/team/:teamId` — Recommended solo candidates for team
- `GET /api/v1/recommendations/user/teams` — Recommended open teams for solo user
- `GET /api/v1/audit/global` — Immutable global platform audit ledger
- `GET /api/v1/audit/team/:teamId` — Team-specific audit events

---

## 🚢 Deployment Guide

### Vercel (Frontend)
Configuration is pre-built in `vercel.json`:
1. Connect repository on Vercel.
2. Root directory: `.`
3. Set `VITE_API_BASE_URL` to your production backend URL.
4. Deploy!

### Render (Backend & Database)
Configuration is pre-built in `render.yaml`:
1. Click **New > Blueprint** on Render.
2. Select this repository.
3. Render automatically provisions the PostgreSQL database and Node.js web service.

---

## 👨‍💻 Author & Attribution

- **Developer**: Naman Goyal
- **Repository**: [https://github.com/namangoyal176-10/ps1](https://github.com/namangoyal176-10/ps1)
- **Challenge**: Hack4Hack Crew Hiring Challenge 2026 — Problem Statement 1 (PS1)
- **License**: MIT
