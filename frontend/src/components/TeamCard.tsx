import React from 'react';
import { Link } from 'react-router-dom';
import { Team } from '../types';
import { Users, Tag, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';

interface TeamCardProps {
  team: Team;
  onRequestJoin?: (team: Team) => void;
  canRequestJoin?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, onRequestJoin, canRequestJoin }) => {
  const currentMembers = team.members ? team.members.length : (team._count?.members || 0);
  const isFull = currentMembers >= team.maxMembers || team.status === 'FULL';
  const openSeats = Math.max(0, team.maxMembers - currentMembers);

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col justify-between group relative overflow-hidden border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70 hover:border-emerald-500/30 shadow-lg">
      {/* Top Banner: Track & Open Seats */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Tag className="w-3 h-3" />
            {team.track}
          </span>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${
              isFull
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
            }`}
          >
            {isFull ? (
              <>
                <Lock className="w-3 h-3" />
                Team Full
              </>
            ) : (
              <>
                <Users className="w-3 h-3" />
                {openSeats} {openSeats === 1 ? 'seat' : 'seats'} open
              </>
            )}
          </span>
        </div>

        {/* Team Name & Description */}
        <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition tracking-tight line-clamp-1">
          {team.name}
        </h3>
        <p className="mt-2 text-sm text-slate-400 line-clamp-2 leading-relaxed">
          {team.description}
        </p>

        {/* Skills Needed */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {team.skillsNeeded && team.skillsNeeded.length > 0 ? (
            team.skillsNeeded.slice(0, 4).map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700/60"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500 italic">Open to all skill sets</span>
          )}
          {team.skillsNeeded && team.skillsNeeded.length > 4 && (
            <span className="text-[11px] text-slate-500 px-1 py-0.5">
              +{team.skillsNeeded.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Footer: Member avatars & Actions */}
      <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center -space-x-2">
          {team.members &&
            team.members.slice(0, 4).map((m, idx) => (
              <div
                key={m.id || idx}
                title={m.user?.fullName || 'Teammate'}
                className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-emerald-400 overflow-hidden shadow"
              >
                {m.user?.fullName ? m.user.fullName.charAt(0) : 'U'}
              </div>
            ))}
          <span className="pl-3 text-xs font-mono text-slate-400">
            {currentMembers}/{team.maxMembers}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canRequestJoin && !isFull && onRequestJoin && (
            <button
              onClick={() => onRequestJoin(team)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-sm transition"
            >
              Request to Join
            </button>
          )}

          <Link
            to={`/teams/${team.id}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="View Team"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
