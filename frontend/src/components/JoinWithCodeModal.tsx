import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

interface JoinWithCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const JoinWithCodeModal: React.FC<JoinWithCodeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await teamsApi.joinWithCode(code.trim().toUpperCase());
      await refreshUser();
      if (onSuccess) onSuccess();
      onClose();
      navigate(`/teams/${res.data.teamId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join team with code');
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

        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-6 h-6 text-emerald-400" />
          <h3 className="text-xl font-bold text-white tracking-tight">Join Team with Passcode</h3>
        </div>
        <p className="text-sm text-slate-400">
          Enter the 8-character invitation code provided by the team leader.
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
              Passcode
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. RACE2026"
              className="w-full text-center font-mono tracking-widest text-lg uppercase rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-3 text-emerald-400 font-bold placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
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
              disabled={loading || !code.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 transition"
            >
              {loading ? (
                'Verifying & Locking...'
              ) : (
                <>
                  Join Instantly
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
