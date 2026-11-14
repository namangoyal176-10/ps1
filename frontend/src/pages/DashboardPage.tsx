import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Compass,
  Sparkles,
  Inbox,
  ShieldCheck,
  PlusCircle,
  KeyRound,
  ArrowRight,
  Crown,
  Activity,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white">Please Sign In</h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to access your hackathon team dashboard and recommendations.
        </p>
        <Link
          to="/login"
          className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const team = user.teamMembership?.team;
  const isLeader = user.teamMembership?.role === 'LEADER';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome banner */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Hack4Hack Participant Verified
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user.fullName}!
            </h1>
            <p className="text-sm text-slate-400">
              @{user.username} • {user.timezone} • {user.skills.slice(0, 4).join(', ')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow transition"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Explore Teams</span>
            </Link>
            {!team && (
              <Link
                to="/create-team"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Team</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Grid: My Team Status & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Team Card */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                My Active Team
              </h2>
              {team && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  Track: {team.track}
                </span>
              )}
            </div>

            {team ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-extrabold text-white">{team.name}</h3>
                  {isLeader && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold uppercase">
                      <Crown className="w-3.5 h-3.5" />
                      Team Leader
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {team.description}
                </p>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-2">
                  <span>Capacity: {team.members?.length || 1} / {team.maxMembers}</span>
                  <span>•</span>
                  <span>Status: <strong className="text-emerald-400">{team.status}</strong></span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">You are a Solo Participant</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You are not currently part of any team. Use our discovery board or AI matchmaking to find the right teammates!
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <Link
                    to="/create-team"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
                  >
                    Create a Team
                  </Link>
                  <Link
                    to="/discover"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                  >
                    Find an Open Team
                  </Link>
                </div>
              </div>
            )}
          </div>

          {team && (
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end">
              <Link
                to={`/teams/${team.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Open Team Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions & Navigation Column */}
        <div className="space-y-4">
          <Link
            to="/recommendations"
            className="glass-card p-5 rounded-2xl border border-slate-800 block group hover:border-emerald-500/40"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                Match Engine
              </span>
              <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
              AI Teammate Matches
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {team
                ? 'Find matching solo participants seeking your team stack'
                : 'Find open squads seeking your skills and timezone'}
            </p>
          </Link>

          <Link
            to="/requests"
            className="glass-card p-5 rounded-2xl border border-slate-800 block group hover:border-emerald-500/40"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                Applications
              </span>
              <Inbox className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
              My Join Requests
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Review status of pending and accepted requests
            </p>
          </Link>

          <Link
            to="/audit"
            className="glass-card p-5 rounded-2xl border border-slate-800 block group hover:border-emerald-500/40"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                Audit Trail
              </span>
              <Activity className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
              System Audit Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Live transactional log of team mutations & row locks
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};
