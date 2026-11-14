import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import {
  User as UserIcon,
  Save,
  CheckCircle,
  AlertCircle,
  Github,
  Globe,
  Clock,
  Sparkles,
} from 'lucide-react';

const COMMON_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'Rust', 'Go',
  'Solidity', 'PyTorch', 'Tailwind CSS', 'Docker', 'UI/UX Design', 'Next.js', 'AWS'
];

const TIMEZONE_OPTIONS = [
  { label: 'UTC-8 (Pacific Time)', offset: -8.0, name: 'UTC-8' },
  { label: 'UTC-5 (Eastern Time)', offset: -5.0, name: 'UTC-5' },
  { label: 'UTC+0 (London / GMT)', offset: 0.0, name: 'UTC+0' },
  { label: 'UTC+1 (Central European)', offset: 1.0, name: 'UTC+1' },
  { label: 'UTC+5:30 (India Standard Time)', offset: 5.5, name: 'UTC+5:30' },
  { label: 'UTC+8 (Singapore / Beijing)', offset: 8.0, name: 'UTC+8' },
  { label: 'UTC+9 (Tokyo / Seoul)', offset: 9.0, name: 'UTC+9' },
];

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    bio: '',
    timezone: 'UTC+0',
    timezoneOffset: 0.0,
    githubUrl: '',
    portfolioUrl: '',
    lookingForTeam: true,
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        bio: user.bio || '',
        timezone: user.timezone || 'UTC+0',
        timezoneOffset: user.timezoneOffset ?? 0.0,
        githubUrl: user.githubUrl || '',
        portfolioUrl: user.portfolioUrl || '',
        lookingForTeam: user.lookingForTeam ?? true,
      });
      setSkills(user.skills || []);
    }
  }, [user]);

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter((s) => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !skills.includes(customSkill.trim())) {
      setSkills([...skills, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = TIMEZONE_OPTIONS.find((t) => t.name === e.target.value);
    if (selected) {
      setFormData({
        ...formData,
        timezone: selected.name,
        timezoneOffset: selected.offset,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await authApi.updateProfile({
        ...formData,
        skills,
      });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-emerald-400" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Profile Settings
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Manage your hackathon bio, skills inventory, and matchmaking preferences.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Profile saved successfully! Matching vectors updated.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Username
            </label>
            <input
              type="text"
              disabled
              value={user?.username || ''}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            About Me / Hackathon Bio
          </label>
          <textarea
            rows={3}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Introduce your background, favorite technologies, and hackathon goals..."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              GitHub Profile URL
            </label>
            <div className="relative">
              <Github className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="url"
                value={formData.githubUrl}
                onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                placeholder="https://github.com/yourhandle"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Portfolio / Website URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="url"
                value={formData.portfolioUrl}
                onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                placeholder="https://yourportfolio.dev"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Primary Timezone
          </label>
          <select
            value={formData.timezone}
            onChange={handleTimezoneChange}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.name} value={tz.name}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            My Skills Inventory
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COMMON_SKILLS.map((skill) => {
              const isSelected = skills.includes(skill);
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
              placeholder="Add other skill..."
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

        {/* Looking for team toggle */}
        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.lookingForTeam}
              onChange={(e) => setFormData({ ...formData, lookingForTeam: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
            />
            <div>
              <span className="text-sm font-semibold text-slate-200">
                Visible to Team Leaders (Looking For Team)
              </span>
              <p className="text-xs text-slate-400">
                Allow team leaders seeking your skills to discover and recommend your profile.
              </p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 transition"
        >
          {loading ? (
            'Saving Changes...'
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Profile
            </>
          )}
        </button>
      </form>
    </div>
  );
};
