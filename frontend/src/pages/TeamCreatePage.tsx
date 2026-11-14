import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { teamsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, AlertCircle, ArrowLeft, Shield } from 'lucide-react';

const TRACKS = [
  'General',
  'AI/ML & Agents',
  'Web3 & Crypto',
  'FinTech',
  'Developer Tools',
  'Healthcare & Biotech',
  'Cybersecurity',
  'Climate & Sustainability',
];

const SKILL_SUGGESTIONS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Rust', 'Go', 
  'Solidity', 'PyTorch', 'PostgreSQL', 'Tailwind CSS', 'Docker', 'UI/UX Design'
];

export const TeamCreatePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    track: 'General',
    maxMembers: 4,
  });
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>(['React', 'Node.js']);
  const [customSkill, setCustomSkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user?.teamMembership) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Active Team Membership Detected</h2>
          <p className="text-sm text-slate-300">
            You are already a member of{' '}
            <span className="text-emerald-400 font-semibold">{user.teamMembership.team?.name}</span>.
            Under hackathon rules, each participant can only belong to one team at a time.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to={`/teams/${user.teamMembership.teamId}`}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
            >
              Go to My Team
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const toggleSkill = (skill: string) => {
    if (skillsNeeded.includes(skill)) {
      setSkillsNeeded(skillsNeeded.filter((s) => s !== skill));
    } else {
      setSkillsNeeded([...skillsNeeded, skill]);
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !skillsNeeded.includes(customSkill.trim())) {
      setSkillsNeeded([...skillsNeeded, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await teamsApi.createTeam({
        ...formData,
        skillsNeeded,
      });

      await refreshUser();
      navigate(`/teams/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link
        to="/discover"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Discovery
      </Link>

      <div className="glass-panel rounded-2xl p-8 border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create a Hackathon Team</h1>
            <p className="text-xs text-slate-400">
              Form your squad with automatic leadership delegation and race protection.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Team Name
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={50}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Quantum Sentinels"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Hackathon Track
              </label>
              <select
                value={formData.track}
                onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
              >
                {TRACKS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Team Size Limit
              </label>
              <select
                value={formData.maxMembers}
                onChange={(e) => setFormData({ ...formData, maxMembers: Number(e.target.value) })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
              >
                <option value={2}>2 Members (Pair)</option>
                <option value={3}>3 Members</option>
                <option value={4}>4 Members (Standard Hackathon)</option>
                <option value={5}>5 Members</option>
                <option value={6}>6 Members</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Project Pitch & Vision
            </label>
            <textarea
              required
              minLength={10}
              maxLength={1000}
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What problem are you solving? What architecture will you use? What roles are you seeking?"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Skills Sought (Used by Match Engine)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {SKILL_SUGGESTIONS.map((skill) => {
                const isSelected = skillsNeeded.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {skill} {isSelected ? '✓' : '+'}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomSkill();
                  }
                }}
                placeholder="Add other skill (e.g. WebRTC)..."
                className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg"
              >
                Add
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
          >
            {loading ? (
              'Creating Team & Initializing Lock...'
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Launch Team
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
