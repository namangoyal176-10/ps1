import React, { useState } from 'react';
import { Team } from '../types';
import { joinRequestsApi } from '../services/api';
import { X, Send, AlertCircle, CheckCircle } from 'lucide-react';

interface JoinRequestModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const JoinRequestModal: React.FC<JoinRequestModalProps> = ({
  team,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !team) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await joinRequestsApi.createJoinRequest(team.id, message);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit join request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-800 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white tracking-tight">Request to Join</h3>
        <p className="mt-1 text-sm text-slate-400">
          Send a request to join <span className="text-emerald-400 font-semibold">{team.name}</span>
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Introduction or Pitch (Optional)
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the leader about your skills, availability, and what you'd like to build together..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 transition"
            >
              {loading ? (
                'Sending...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
