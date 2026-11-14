import React from 'react';
import { Shield, Github, Heart, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950/80 mt-auto py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">RaceProof – Concurrency Safe Hackathon Engine</p>
              <p className="text-xs text-slate-500 font-mono">PostgreSQL Row Locks • 10k Capacity • Sub-100ms Latency</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-sm text-slate-400">
            <a
              href="https://github.com/namangoyal176-10/ps1"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-emerald-400 transition"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Repo</span>
            </a>
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              <span>Hack4Hack 2026 PS1</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <span>Engineered with</span>
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>by Naman Goyal</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
