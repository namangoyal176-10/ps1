import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { teamsApi, joinRequestsApi, auditApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { InviteModal } from '../components/InviteModal';
import { JoinRequestModal } from '../components/JoinRequestModal';
import {
  Users,
  Shield,
  Crown,
  KeyRound,
  LogOut,
  UserMinus,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Clock,
  History,
  Tag,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Lock,
} from 'lucide-react';

export const TeamDetailPage: React.FC = () => {
  const { id: teamId } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const { joinTeam, leaveTeam } = useSocket();
  const navigate = useNavigate();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Subscribe to team socket room for instant live updates
  useEffect(() => {
    if (teamId) {
      joinTeam(teamId);
      return () => leaveTeam(teamId);
    }
  }, [teamId]);

  const {
    data: teamRes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamsApi.getTeamById(teamId!),
    enabled: !!teamId,
  });

  const { data: auditRes } = useQuery({
    queryKey: ['team_audit', teamId],
    queryFn: () => auditApi.getTeamAuditLogs(teamId!),
    enabled: !!teamId,
  });

  const team = teamRes?.data;
  const auditLogs = auditRes?.data || [];

  if (isLoading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading team details...</p>
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Team Not Found</h2>
          <p className="text-sm text-slate-400">
            This team may have been deleted or the link is incorrect.
          </p>
          <Link
            to="/discover"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Discovery
          </Link>
        </div>
      </div>
    );
  }

  const isLeader = team.members.some(
    (m) => m.userId === user?.id && m.role === 'LEADER'
  );
  const isMember = team.members.some((m) => m.userId === user?.id);
  const currentMemberCount = team.members.length;
  const isFull = currentMemberCount >= team.maxMembers || team.status === 'FULL';

  // Handle Leave Team
  const handleLeaveTeam = async () => {
    if (
      !window.confirm(
        isLeader && team.members.length > 1
          ? 'You are the leader. Leaving will automatically transfer leadership to the next senior member. Continue?'
          : 'Are you sure you want to leave this team?'
      )
    ) {
      return;
    }

    try {
      setActionError(null);
      const res = await teamsApi.leaveTeam(team.id);
      await refreshUser();

      if (res.data?.action === 'TEAM_DELETED') {
        navigate('/discover');
      } else {
        refetch();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to leave team');
    }
  };

  // Handle Accept Request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      setActionError(null);
      await joinRequestsApi.acceptJoinRequest(requestId);
      setActionSuccess('Join request accepted! Member added.');
      refetch();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to accept request');
    }
  };

  // Handle Decline Request
  const handleDeclineRequest = async (requestId: string) => {
    try {
      setActionError(null);
      await joinRequestsApi.declineJoinRequest(requestId);
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to decline request');
    }
  };

  // Handle Kick Member
  const handleKickMember = async (memberUserId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    try {
      setActionError(null);
      await teamsApi.kickMember(team.id, memberUserId);
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove member');
    }
  };

  // Handle Transfer Leadership
  const handleTransferLeadership = async (targetUserId: string, memberName: string) => {
    if (!window.confirm(`Make ${memberName} the new team leader?`)) {
      return;
    }

    try {
      setActionError(null);
      await teamsApi.transferLeadership(team.id, targetUserId);
      await refreshUser();
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to transfer leadership');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <InviteModal
        teamId={team.id}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      <JoinRequestModal
        team={team}
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Back button */}
      <div>
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Discovery Board
        </Link>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Team Banner */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Tag className="w-3 h-3" />
                {team.track}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
                  isFull
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                }`}
              >
                {isFull ? <Lock className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                {currentMemberCount} / {team.maxMembers} Members
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {team.name}
            </h1>

            <p className="text-slate-300 text-base leading-relaxed">
              {team.description}
            </p>

            {/* Skills tags */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">
                Tech Stack:
              </span>
              {team.skillsNeeded && team.skillsNeeded.length > 0 ? (
                team.skillsNeeded.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">General stack</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
            {isLeader && (
              <button
                onClick={() => setInviteModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
              >
                <KeyRound className="w-4 h-4" />
                Invite Codes
              </button>
            )}

            {!isMember && !isFull && (
              <button
                onClick={() => setRequestModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
              >
                Request to Join
              </button>
            )}

            {isMember && (
              <button
                onClick={handleLeaveTeam}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition"
              >
                <LogOut className="w-4 h-4" />
                Leave Team
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pending Join Requests (Visible to Leader Only) */}
      {isLeader && team.pendingRequests && team.pendingRequests.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 bg-emerald-950/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Pending Join Requests ({team.pendingRequests.length})
            </h2>
            <span className="text-xs text-slate-400 font-mono">Row-Locked Approvals</span>
          </div>

          <div className="space-y-3">
            {team.pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{req.user?.fullName}</span>
                    <span className="text-xs text-slate-400">@{req.user?.username}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {req.user?.timezone}
                    </span>
                  </div>

                  {req.message && (
                    <p className="mt-1 text-sm text-slate-300 italic">"{req.message}"</p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {req.user?.skills?.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-mono"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={isFull}
                    onClick={() => handleAcceptRequest(req.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 shadow transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Roster Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          Team Roster ({currentMemberCount}/{team.maxMembers})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {team.members.map((member) => {
            const isMemberLeader = member.role === 'LEADER';
            const isSelf = member.userId === user?.id;

            return (
              <div
                key={member.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-lg">
                        {member.user.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">
                            {member.user.fullName}
                          </h3>
                          {isMemberLeader && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase font-mono">
                              <Crown className="w-3 h-3" />
                              Leader
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          @{member.user.username} • {member.user.timezone}
                        </p>
                      </div>
                    </div>

                    {/* Member joined timestamp */}
                    <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {member.user.bio && (
                    <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {member.user.bio}
                    </p>
                  )}

                  {/* Skills tags */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {member.user.skills &&
                      member.user.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300"
                        >
                          {s}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Leader Actions on other members */}
                {isLeader && !isMemberLeader && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() =>
                        handleTransferLeadership(member.userId, member.user.fullName)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      title="Promote to Leader"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Transfer Lead
                    </button>
                    <button
                      onClick={() => handleKickMember(member.userId, member.user.fullName)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
                      title="Remove member"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Kick
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Immutable Audit Trail for this Team */}
      <div className="space-y-4 pt-4 border-t border-slate-900">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          Team Audit Log
        </h2>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono">No audit events recorded yet.</p>
        ) : (
          <div className="glass-panel rounded-2xl border border-slate-800 divide-y divide-slate-800/60 overflow-hidden">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono px-2 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-semibold">
                    {log.action}
                  </span>
                  <span className="text-slate-300">
                    by <strong className="text-white">{log.actor?.fullName || 'System'}</strong>
                  </span>
                </div>
                <span className="font-mono text-slate-500">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
