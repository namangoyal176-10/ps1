import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { JoinRequestModal } from '../components/JoinRequestModal';
import { Team, ScoredUserRecommendation, ScoredTeamRecommendation } from '../types';
import {
  Sparkles,
  Users,
  Compass,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Github,
  Globe,
  Tag,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const RecommendationsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const isInTeam = !!user?.teamMembership;
  const userTeamId = user?.teamMembership?.teamId;

  // Query teammate recommendations for team
  const {
    data: teammatesRes,
    isLoading: loadingTeammates,
  } = useQuery({
    queryKey: ['teammate_recommendations', userTeamId],
    queryFn: () => recommendationsApi.getTeammatesForTeam(userTeamId!),
    enabled: !!userTeamId,
  });

  // Query team recommendations for solo user
  const {
    data: teamsRes,
    isLoading: loadingTeams,
  } = useQuery({
    queryKey: ['team_recommendations', user?.id],
    queryFn: () => recommendationsApi.getTeamsForUser(),
    enabled: !isInTeam && !!user,
  });

  const teammateMatches: ScoredUserRecommendation[] = teammatesRes?.data || [];
  const teamMatches: ScoredTeamRecommendation[] = teamsRes?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <JoinRequestModal
        team={selectedTeam}
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Intelligent Teammate Matching
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Ranked recommendations powered by Jaccard skill overlap & timezone proximity decay.
        </p>
      </div>

      {!user ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
          <Users className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">Sign In to View Matches</h3>
          <p className="text-sm text-slate-400">
            Sign in or register to receive personalized teammate and squad recommendations.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      ) : isInTeam ? (
        /* Team Leader / Member View: Recommended Solo Teammates */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Solo Candidates for {user.teamMembership?.team.name}
              </h2>
              <p className="text-xs text-slate-400">
                Solo participants matching your team's sought skills and average timezone
              </p>
            </div>
            <Link
              to={`/teams/${userTeamId}`}
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              View My Team <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingTeammates ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-slate-400">Computing match matrices...</p>
            </div>
          ) : teammateMatches.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No available solo matches</h3>
              <p className="text-xs text-slate-400">
                All matching candidates may currently belong to teams. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teammateMatches.map((match, idx) => (
                <div
                  key={match.user.id || idx}
                  className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
                          {match.user.fullName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base leading-snug">
                            {match.user.fullName}
                          </h3>
                          <p className="text-xs text-slate-400">
                            @{match.user.username} • {match.user.timezone}
                          </p>
                        </div>
                      </div>

                      {/* Match percentage score */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                        <Sparkles className="w-3 h-3" />
                        {match.matchScore}% Match
                      </span>
                    </div>

                    {match.user.bio && (
                      <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                        {match.user.bio}
                      </p>
                    )}

                    {/* Matching skills */}
                    <div className="mt-4 space-y-2">
                      <div className="text-[11px] font-mono text-slate-500 uppercase">
                        Matching Skills:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {match.matchingSkills.map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-mono"
                          >
                            {s} ✓
                          </span>
                        ))}
                        {match.user.skills
                          .filter((s) => !match.matchingSkills.includes(s))
                          .map((s, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 text-[11px] font-mono"
                            >
                              {s}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Δ {match.timezoneDifferenceHours}h difference
                    </span>
                    <span className="text-emerald-400">Looking for team</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Solo Participant View: Recommended Teams */
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              Recommended Teams For Your Skill Profile
            </h2>
            <p className="text-xs text-slate-400">
              Teams seeking your expertise with aligned timezones and open spots
            </p>
          </div>

          {loadingTeams ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-slate-400">Analyzing open teams...</p>
            </div>
          ) : teamMatches.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
              <Compass className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No direct team matches</h3>
              <p className="text-xs text-slate-400">
                Explore the discovery board or update your profile skills to match more squads.
              </p>
              <Link
                to="/discover"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white"
              >
                Go to Discovery Board
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMatches.map((match, idx) => (
                <div
                  key={match.team.id || idx}
                  className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Tag className="w-3 h-3" />
                        {match.team.track}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                        <Sparkles className="w-3 h-3" />
                        {match.matchScore}% Match
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white leading-tight">
                      {match.team.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                      {match.team.description}
                    </p>

                    <div className="mt-4 space-y-1.5">
                      <div className="text-[11px] font-mono text-slate-500 uppercase">
                        Matching Your Skills:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {match.matchingSkills.map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono"
                          >
                            {s} ✓
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Δ {match.timezoneDifferenceHours}h
                    </span>

                    <button
                      onClick={() => {
                        setSelectedTeam(match.team as any);
                        setRequestModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
                    >
                      Request to Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
