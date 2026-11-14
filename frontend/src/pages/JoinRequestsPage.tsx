import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { joinRequestsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Inbox,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const JoinRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: myRequestsRes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['my_requests'],
    queryFn: () => joinRequestsApi.getMyRequests(),
    enabled: !!user,
  });

  const requests = myRequestsRes?.data || [];

  const handleCancelRequest = async (requestId: string) => {
    try {
      setActionError(null);
      await joinRequestsApi.cancelJoinRequest(requestId);
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel request');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Inbox className="w-6 h-6 text-emerald-400" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            My Join Requests
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Track the status of team invitations and membership applications.
        </p>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading your requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-4">
          <Send className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No requests sent yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Browse the discovery board to find teams looking for your skills and submit a join request.
          </p>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
          >
            Explore Teams
          </Link>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-xl">
          {requests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isAccepted = req.status === 'ACCEPTED';
            const isDeclined = req.status === 'DECLINED';
            const isCancelled = req.status === 'CANCELLED';

            return (
              <div
                key={req.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/teams/${req.teamId}`}
                      className="font-bold text-white text-base hover:text-emerald-400 transition"
                    >
                      {req.team?.name || 'Unknown Team'}
                    </Link>
                    <span className="text-xs text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {req.team?.track}
                    </span>
                  </div>

                  {req.message && (
                    <p className="text-xs text-slate-300 italic">
                      "{req.message}"
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Submitted {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock className="w-3 h-3" />
                      Pending Leader Review
                    </span>
                  )}
                  {isAccepted && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle className="w-3 h-3" />
                      Accepted
                    </span>
                  )}
                  {isDeclined && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <XCircle className="w-3 h-3" />
                      Declined
                    </span>
                  )}
                  {isCancelled && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold font-mono bg-slate-800 text-slate-400">
                      Cancelled
                    </span>
                  )}

                  {/* Cancel Button */}
                  {isPending && (
                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Cancel request"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
