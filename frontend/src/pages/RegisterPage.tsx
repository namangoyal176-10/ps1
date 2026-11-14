import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserPlus, AlertCircle } from 'lucide-react';

const COMMON_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'Rust', 'Go', 
  'Solidity', 'PyTorch', 'Tailwind CSS', 'Docker', 'UI/UX Design'
];

const TIMEZONE_OPTIONS = [
  { label: 'UTC-8 (Pacific)', offset: -8.0, name: 'UTC-8' },
  { label: 'UTC-5 (Eastern)', offset: -5.0, name: 'UTC-5' },
  { label: 'UTC+0 (London)', offset: 0.0, name: 'UTC+0' },
  { label: 'UTC+1 (Berlin)', offset: 1.0, name: 'UTC+1' },
  { label: 'UTC+5:30 (India)', offset: 5.5, name: 'UTC+5:30' },
  { label: 'UTC+8 (Singapore)', offset: 8.0, name: 'UTC+8' },
  { label: 'UTC+9 (Tokyo)', offset: 9.0, name: 'UTC+9' },
];

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    fullName: '',
    bio: '',
    timezone: 'UTC+0',
    timezoneOffset: 0.0,
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['React', 'TypeScript']);
  const [customSkill, setCustomSkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills([...selectedSkills, customSkill.trim()]);
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

    try {
      await register({
        ...formData,
        skills: selectedSkills,
      });
      navigate('/discover');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="glass-panel w-full max-w-xl rounded-2xl p-8 border border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 mb-4">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Join RaceProof</h2>
          <p className="mt-1 text-sm text-slate-400">Create your hackathon profile and start forming teams</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="e.g. Alex Vance"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. alex_vance"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="alex@hack4hack.dev"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min 8 characters"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Timezone (For Team Proximity Matching)
            </label>
            <select
              value={formData.timezone}
              onChange={handleTimezoneChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
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
              Select Your Core Skills
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_SKILLS.map((skill) => {
                const selected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      selected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {skill} {selected ? '✓' : '+'}
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
                placeholder="Add other skill (press enter)..."
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
              'Creating Account...'
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Register & Start Building
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
