import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teamsApi } from '../services/api';
import { TeamCard } from '../components/TeamCard';
import { JoinRequestModal } from '../components/JoinRequestModal';
import { JoinWithCodeModal } from '../components/JoinWithCodeModal';
import { useAuth } from '../context/AuthContext';
import { Team } from '../types';
import { 
  Search, 
  Filter, 
  Sparkles, 
  KeyRound, 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const TRACKS = [
  'All',
  'AI/ML & Agents',
  'Web3 & Crypto',
  'FinTech',
  'Developer Tools',
  'Healthcare & Biotech',
  'Cybersecurity',
  'General',
];

export const DiscoveryPage: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('All');
  const [hasOpenSpots, setHasOpenSpots] = useState(false);
  const [page, setPage] = useState(1);

  // Modals state
  const [selectedTeamForRequest, setSelectedTeamForRequest] = useState<Team | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teams', { search, track: selectedTrack, hasOpenSpots, page }],
    queryFn: async () => {
      const res = await teamsApi.getTeams({
        search: search.trim() || undefined,
        track: selectedTrack !== 'All' ? selectedTrack : undefined,
        hasOpenSpots: hasOpenSpots || undefined,
        page,
        limit: 12,
      });
      return res;
    },
    staleTime: 5000,
  });

  const teams = data?.data || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  const handleOpenRequestModal = (team: Team) => {
    setSelectedTeamForRequest(team);
    setRequestModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Modals */}
      <JoinRequestModal
        team={selectedTeamForRequest}
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={() => refetch()}
      />

      <JoinWithCodeModal
        isOpen={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Header & Quick Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Team Discovery Board
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
              Live
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Browse active teams across hackathon tracks or join directly with an invitation passcode.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setCodeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow transition"
          >
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>Enter Passcode</span>
          </button>

          {user && !user.teamMembership && (
            <Link
              to="/create-team"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Team</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search teams by name, idea, or tech stack..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Open spots checkbox */}
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer text-sm font-medium text-slate-300 select-none hover:border-slate-700">
            <input
              type="checkbox"
              checked={hasOpenSpots}
              onChange={(e) => {
                setHasOpenSpots(e.target.checked);
                setPage(1);
              }}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Open seats only</span>
          </label>
        </div>

        {/* Tracks horizontal scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Track:
          </span>
          {TRACKS.map((track) => (
            <button
              key={track}
              onClick={() => {
                setSelectedTrack(track);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedTrack === track
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800/80'
              }`}
            >
              {track}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Teams */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading hackathon teams...</p>
        </div>
      ) : isError ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-3 border-rose-500/20">
          <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-white font-semibold">Unable to load teams from the server.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200"
          >
            Retry
          </button>
        </div>
      ) : teams.length === 0 ? (
        <div className="glass-panel py-16 px-4 rounded-2xl text-center space-y-4">
          <Sparkles className="w-10 h-10 text-emerald-400/50 mx-auto" />
          <h3 className="text-lg font-bold text-white">No teams match your criteria</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Try adjusting your search terms or track filters, or be the first to create a team for this track!
          </p>
          {user && !user.teamMembership && (
            <Link
              to="/create-team"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
            >
              Create Team Now
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              canRequestJoin={!!user && !user.teamMembership}
              onRequestJoin={handleOpenRequestModal}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {meta.totalPages && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-900">
          <p className="text-xs font-mono text-slate-400">
            Showing Page <span className="text-white font-bold">{meta.page}</span> of{' '}
            <span className="text-white font-bold">{meta.totalPages}</span> ({meta.total} total teams)
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-3 text-slate-300">
              {page} / {meta.totalPages}
            </span>
            <button
              disabled={meta.totalPages ? page >= meta.totalPages : true}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
