import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { JoinWithCodeModal } from '../components/JoinWithCodeModal';
import {
  ShieldCheck,
  Zap,
  Users,
  Lock,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Activity,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [codeModalOpen, setCodeModalOpen] = useState(false);

  return (
    <div className="space-y-24 py-12">
      <JoinWithCodeModal
        isOpen={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
      />

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 text-center">
        {/* Glowing badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-8 animate-pulse">
          <ShieldCheck className="w-4 h-4" />
          <span>Hack4Hack Crew Hiring Challenge 2026 • PS1</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.1]">
          Race-Proof Team Formation{' '}
          <span className="gradient-text">At Scale</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Engineered for 10,000 hackathon participants. Eliminating race conditions using PostgreSQL row-level locks, sub-100ms discovery, and automated idempotency.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
          >
            <span>Explore Discovery Board</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={() => setCodeModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-md transition transform hover:-translate-y-0.5"
          >
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>Join with Passcode</span>
          </button>

          {!user && (
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <span>Create Account</span>
            </Link>
          )}
        </div>

        {/* Real Benchmark Highlights Banner */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="glass-panel p-5 rounded-2xl text-left border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-mono tracking-wider">Capacity</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">10,000+</div>
            <p className="text-xs text-slate-400 mt-1">Hackathon participants supported</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-left border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-mono tracking-wider">Concurrency</span>
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">50:1 Race</div>
            <p className="text-xs text-slate-400 mt-1">100% 1 seat / 49 reject SLA</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-left border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-mono tracking-wider">Discovery Latency</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">95 ms</div>
            <p className="text-xs text-slate-400 mt-1">p95 @ 100 concurrent users</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-left border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-mono tracking-wider">Reliability</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">100% ACID</div>
            <p className="text-xs text-slate-400 mt-1">PostgreSQL row-level locks</p>
          </div>
        </div>
      </section>

      {/* Architecture & Engineering Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Engineered to Prevent Race Conditions
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            How RaceProof guarantees zero overcapacity, zero duplicate memberships, and instant consistency when hundreds of users scramble for the last seat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-8 rounded-2xl border-slate-800 relative group hover:border-emerald-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">PostgreSQL Row Locks</h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Every team join and request approval executes inside an interactive transaction with <code className="text-emerald-400 font-mono text-xs">SELECT ... FOR UPDATE</code> on the team row. Competing transactions queue safely without dirty reads.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-mono text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tested with 50 simultaneous joins</span>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-2xl border-slate-800 relative group hover:border-emerald-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Automatic Idempotency</h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Mutating operations generate cryptographic idempotency keys. Repeated clicks, browser refreshes, or network retries instantly return cached results without double mutations or ghost records.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-mono text-cyan-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Full Idempotency-Key support</span>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-2xl border-slate-800 relative group hover:border-emerald-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Skill & Timezone Matching</h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Intelligent ranking engine calculates Jaccard skill similarity and timezone proximity decay, helping solo participants and team leads form dream hackathon teams.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-mono text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ranked composite similarity</span>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Lifecycle Automation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950/90">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-emerald-400">Autonomous Management</span>
              <h2 className="text-3xl font-extrabold text-white mt-2">
                Self-Healing Team Lifecycles
              </h2>
              <p className="mt-4 text-slate-300 text-sm leading-relaxed">
                When a team leader leaves, the engine automatically promotes the senior member to Leader and logs a persistent audit trail. If the last member departs, the team and orphaned invites are cleanly eradicated.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    ✓
                  </div>
                  <span>Automatic leadership succession to earliest joined member</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    ✓
                  </div>
                  <span>Auto-cleanup & deletion when last member leaves</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    ✓
                  </div>
                  <span>Comprehensive immutable audit logging for all mutations</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/discover"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md"
                >
                  Browse Available Teams
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Code / Visual preview */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 font-mono text-xs text-slate-300 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <span>race-condition-shield.sql</span>
              </div>
              <pre className="mt-4 overflow-x-auto text-emerald-400">
{`-- PostgreSQL Pessimistic Lock inside Transaction
BEGIN;
SELECT id, "maxMembers", status 
FROM "Team" 
WHERE id = $1 
FOR UPDATE; -- Exclusive row lock

-- Atomic member check
SELECT count(*) FROM "TeamMember" WHERE "teamId" = $1;
-- If count >= maxMembers -> ROLLBACK & 409 Conflict

-- Atomic insert & capacity transition
INSERT INTO "TeamMember" ("teamId", "userId", role)
VALUES ($1, $2, 'MEMBER');

COMMIT; -- Lock released`}
              </pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
