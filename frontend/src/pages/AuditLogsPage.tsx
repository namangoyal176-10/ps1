import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../services/api';
import {
  History,
  Shield,
  Clock,
  Filter,
  User,
  CheckCircle2,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ACTION_COLORS: Record<string, string> = {
  TEAM_CREATED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  TEAM_UPDATED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TEAM_DELETED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  MEMBER_JOINED: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  MEMBER_LEFT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  MEMBER_KICKED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  LEADERSHIP_TRANSFERRED: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  INVITE_CREATED: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  INVITE_ACCEPTED: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  INVITE_REVOKED: 'bg-slate-800 text-slate-400 border-slate-700',
  REQUEST_SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  REQUEST_ACCEPTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REQUEST_DECLINED: 'bg-slate-800 text-slate-400 border-slate-700',
  REQUEST_CANCELLED: 'bg-slate-800 text-slate-500 border-slate-800',
};

export const AuditLogsPage: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const { data: logsRes, isLoading } = useQuery({
    queryKey: ['global_audit'],
    queryFn: () => auditApi.getGlobalAuditLogs(100),
    refetchInterval: 5000,
  });

  const logs = logsRes?.data || [];

  const filteredLogs = selectedAction === 'ALL'
    ? logs
    : logs.filter((l) => l.action === selectedAction);

  const uniqueActions = ['ALL', ...Array.from(new Set(logs.map((l) => l.action)))];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-400" />
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Audit Logs & Ledger
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Immutable, transactional log of all team formations, joins, leadership transfers, and lifecycle events.
          </p>
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading audit records...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
          <Shield className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No audit logs found</h3>
          <p className="text-xs text-slate-400">
            Mutations like creating teams, joining via invite codes, or leaving will populate this ledger.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 divide-y divide-slate-800/60 overflow-hidden shadow-xl">
          {filteredLogs.map((log) => {
            const badgeClass = ACTION_COLORS[log.action] || 'bg-slate-800 text-slate-400';

            return (
              <div
                key={log.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}
                    >
                      {log.action}
                    </span>

                    {log.team && (
                      <Link
                        to={`/teams/${log.team.id}`}
                        className="text-xs font-semibold text-slate-300 hover:text-emerald-400 transition"
                      >
                        Team: {log.team.name}
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 pt-0.5">
                    <span>
                      Actor:{' '}
                      <strong className="text-white">
                        {log.actor ? `${log.actor.fullName} (@${log.actor.username})` : 'System Engine'}
                      </strong>
                    </span>
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 inline-block">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <span className="font-mono text-xs text-slate-500 flex items-center gap-1 sm:justify-end">
                    <Clock className="w-3 h-3" />
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
