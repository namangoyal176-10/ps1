import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, clearDatabase, createTestUser } from './setup.js';
import { prisma } from '../src/config/prisma.js';
import { MemberRole, TeamStatus } from '@prisma/client';

describe('Critical Concurrency Tests - Race-Proof Team Joining', () => {
  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  it('Scenario 1: Exactly 1 seat remaining; 50 concurrent users attempt to join via invite code', async () => {
    // 1. Create Team Leader and 2 initial members (Total 3 members; maxMembers = 4; exactly 1 seat open)
    const { user: leader, token: leaderToken } = await createTestUser({
      email: 'lead_concur@raceproof.dev',
      username: 'lead_concur',
    });
    const { user: mem1 } = await createTestUser({
      email: 'mem1_concur@raceproof.dev',
      username: 'mem1_concur',
    });
    const { user: mem2 } = await createTestUser({
      email: 'mem2_concur@raceproof.dev',
      username: 'mem2_concur',
    });

    const team = await prisma.team.create({
      data: {
        name: 'Concurrency Shield Alpha',
        description: 'Testing high-concurrency race condition protection with 50 simultaneous joins',
        maxMembers: 4,
        status: TeamStatus.OPEN,
        members: {
          create: [
            { userId: leader.id, role: MemberRole.LEADER },
            { userId: mem1.id, role: MemberRole.MEMBER },
            { userId: mem2.id, role: MemberRole.MEMBER },
          ],
        },
      },
    });

    // 2. Generate a valid invite code with maxUses = 50
    const inviteRes = await request(app)
      .post('/api/v1/invites')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        teamId: team.id,
        maxUses: 50,
        expiresInHours: 24,
      });

    expect(inviteRes.status).toBe(201);
    const inviteCode = inviteRes.body.data.code;

    // Verify initial state: exactly 3 members
    const initialCount = await prisma.teamMember.count({ where: { teamId: team.id } });
    expect(initialCount).toBe(3);

    // 3. Create 50 independent candidate users
    console.log('Generating 50 concurrent users for race testing...');
    const candidates: Array<{ user: any; token: string }> = [];
    for (let i = 0; i < 50; i++) {
      const candidate = await createTestUser({
        email: `concur_candidate_${i}@raceproof.dev`,
        username: `candidate_${i}`,
      });
      candidates.push(candidate);
    }

    // 4. Fire 50 simultaneous HTTP requests to join the team
    console.log('Firing 50 simultaneous join requests...');
    const joinPromises = candidates.map((candidate) =>
      request(app)
        .post('/api/v1/teams/join-with-code')
        .set('Authorization', `Bearer ${candidate.token}`)
        .send({ code: inviteCode })
    );

    const results = await Promise.all(joinPromises);

    // 5. Analyze results
    const successResponses = results.filter((r) => r.status === 200);
    const conflictResponses = results.filter((r) => r.status === 409);
    const otherResponses = results.filter((r) => r.status !== 200 && r.status !== 409);

    console.log(`Results: ${successResponses.length} Success (200), ${conflictResponses.length} Conflict (409), ${otherResponses.length} Other`);

    // EXACT REQUIREMENTS ASSERTION:
    // Exactly 1 successful join
    expect(successResponses.length).toBe(1);

    // Exactly 49 rejected requests
    expect(conflictResponses.length).toBe(49);
    expect(otherResponses.length).toBe(0);

    // 6. Database Integrity Verification:
    // No team capacity violation: total members must be exactly 4 (maxMembers)
    const finalMemberCount = await prisma.teamMember.count({ where: { teamId: team.id } });
    expect(finalMemberCount).toBe(4);

    // Team status must be automatically transitioned to FULL
    const updatedTeam = await prisma.team.findUnique({ where: { id: team.id } });
    expect(updatedTeam?.status).toBe(TeamStatus.FULL);

    // Invite code usedCount must be incremented by exactly 1
    const updatedInvite = await prisma.teamInvite.findUnique({ where: { code: inviteCode } });
    expect(updatedInvite?.usedCount).toBe(1);

    // No duplicate memberships
    const allMembers = await prisma.teamMember.findMany({ where: { teamId: team.id } });
    const memberUserIds = allMembers.map((m) => m.userId);
    const uniqueUserIds = new Set(memberUserIds);
    expect(uniqueUserIds.size).toBe(4);

    // The single winner user's lookingForTeam flag must be false
    const winnerUserId = successResponses[0].body.data.member.userId;
    const winnerUser = await prisma.user.findUnique({ where: { id: winnerUserId } });
    expect(winnerUser?.lookingForTeam).toBe(false);

    // The remaining 49 users must NOT have any team membership
    const nonJoinedCandidates = candidates.filter((c) => c.user.id !== winnerUserId);
    const nonJoinedMemberships = await prisma.teamMember.findMany({
      where: { userId: { in: nonJoinedCandidates.map((c) => c.user.id) } },
    });
    expect(nonJoinedMemberships.length).toBe(0);

    // Audit log must reflect exactly 1 MEMBER_JOINED entry for this invite
    const joinAuditLogs = await prisma.auditLog.findMany({
      where: { teamId: team.id, action: 'MEMBER_JOINED' },
    });
    expect(joinAuditLogs.length).toBe(1);
  }, 45000);

  it('Scenario 2: Team leader accepts join requests concurrently when only 1 seat remains', async () => {
    // Team with 3 members, 1 seat open
    const { user: leader, token: leaderToken } = await createTestUser({
      email: 'lead_req_concur@raceproof.dev',
      username: 'lead_req_concur',
    });
    const { user: mem1 } = await createTestUser();
    const { user: mem2 } = await createTestUser();

    const team = await prisma.team.create({
      data: {
        name: 'Concurrency Request Shield',
        description: 'Testing concurrency on join request approvals',
        maxMembers: 4,
        status: TeamStatus.OPEN,
        members: {
          create: [
            { userId: leader.id, role: MemberRole.LEADER },
            { userId: mem1.id, role: MemberRole.MEMBER },
            { userId: mem2.id, role: MemberRole.MEMBER },
          ],
        },
      },
    });

    // Create 10 applicants with pending join requests
    const applicants: Array<{ user: any; requestId: string }> = [];
    for (let i = 0; i < 10; i++) {
      const { user, token } = await createTestUser({
        email: `req_app_${i}@raceproof.dev`,
        username: `req_app_${i}`,
      });
      const reqRes = await request(app)
        .post('/api/v1/join-requests')
        .set('Authorization', `Bearer ${token}`)
        .send({ teamId: team.id, message: `Applicant ${i}` });

      expect(reqRes.status).toBe(201);
      applicants.push({ user, requestId: reqRes.body.data.id });
    }

    // Leader attempts to accept all 10 requests simultaneously
    const acceptPromises = applicants.map((a) =>
      request(app)
        .post(`/api/v1/join-requests/${a.requestId}/accept`)
        .set('Authorization', `Bearer ${leaderToken}`)
    );

    const results = await Promise.all(acceptPromises);

    const success = results.filter((r) => r.status === 200);
    const conflict = results.filter((r) => r.status === 409);

    expect(success.length).toBe(1);
    expect(conflict.length).toBe(9);

    const finalCount = await prisma.teamMember.count({ where: { teamId: team.id } });
    expect(finalCount).toBe(4);
  }, 30000);
});
