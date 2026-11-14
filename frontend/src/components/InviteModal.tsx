import React, { useState, useEffect } from 'react';
import { TeamInvite } from '../types';
import { invitesApi } from '../services/api';
import { X, Copy, Check, Plus, Trash2, KeyRound, Clock, AlertCircle } from 'lucide-react';

interface InviteModalProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ teamId, isOpen, onClose }) => {
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const res = await invitesApi.getTeamInvites(teamId);
      if (res.success && res.data) {
        setInvites(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInvites();
    }
  }, [isOpen, teamId]);

  if (!isOpen) return null;

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await invitesApi.createInvite({
        teamId,
        maxUses: Number(maxUses),
        expiresInHours: Number(expiresInHours),
      });
      await loadInvites();
    } catch (err: any) {
      setError(err.message || 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await invitesApi.revokeInvite(id);
      await loadInvites();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke invite');
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-emerald-400" />
          <h3 className="text-xl font-bold text-white tracking-tight">Team Invitation Codes</h3>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Generate secure, race-condition protected invitation codes with expiration and usage limits.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Generate New Code Form */}
        <form onSubmit={handleCreateInvite} className="mt-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Create New Passcode</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Maximum Uses</label>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>1 use (Single-use)</option>
                <option value={2}>2 uses</option>
                <option value={5}>5 uses</option>
                <option value={10}>10 uses</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Expiration</label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={24}>24 Hours</option>
                <option value={72}>3 Days (72 Hours)</option>
                <option value={168}>7 Days</option>
                <option value={720}>30 Days</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Generating Code...' : 'Generate Secure Code'}
          </button>
        </form>

        {/* Existing Invitations List */}
        <div className="mt-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Invitation Codes</h4>

          {loading ? (
            <p className="text-sm text-slate-500 py-4 text-center">Loading codes...</p>
          ) : invites.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No active invitation codes yet.</p>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => {
                const isExpired = new Date(inv.expiresAt) < new Date();
                const isUsedUp = inv.usedCount >= inv.maxUses;
                const isInactive = inv.isRevoked || isExpired || isUsedUp;

                return (
                  <div
                    key={inv.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isInactive
                        ? 'bg-slate-950/40 border-slate-900 opacity-60'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-emerald-400 tracking-wider">
                          {inv.code}
                        </span>
                        {inv.isRevoked && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Revoked
                          </span>
                        )}
                        {isExpired && !inv.isRevoked && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Expired
                          </span>
                        )}
                        {isUsedUp && !isExpired && !inv.isRevoked && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Redeemed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                        <span>Uses: {inv.usedCount}/{inv.maxUses}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isInactive && (
                        <button
                          onClick={() => handleCopy(inv.code)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Copy Code"
                        >
                          {copiedCode === inv.code ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {!inv.isRevoked && (
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Revoke Code"
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
      </div>
    </div>
  );
};
