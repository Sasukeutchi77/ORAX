import React from 'react';
import { 
  Trophy, 
  Download, 
  Eye, 
  Star, 
  FolderGit2, 
  Sparkles, 
  User, 
  UserCheck, 
  ArrowUpRight, 
  Medal,
  Award
} from 'lucide-react';
import { DeveloperInfo, Project } from '../types';
import { motion } from 'motion/react';

interface DeveloperLeaderboardProps {
  leaderboard: DeveloperInfo[];
  onSelectDeveloper: (developerName: string) => void;
  onSelectProject: (project: Project) => void;
  followedDevelopers?: string[];
}

export const DeveloperLeaderboard: React.FC<DeveloperLeaderboardProps> = ({
  leaderboard,
  onSelectDeveloper,
  onSelectProject,
  followedDevelopers = [],
}) => {
  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: '🥇',
          bg: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
          title: 'Champion des Téléchargements',
        };
      case 2:
        return {
          icon: '🥈',
          bg: 'bg-slate-300/20 border-slate-300/50 text-slate-200',
          title: '2ème Position',
        };
      case 3:
        return {
          icon: '🥉',
          bg: 'bg-amber-700/20 border-amber-700/50 text-amber-500',
          title: '3ème Position',
        };
      default:
        return {
          icon: `#${rank}`,
          bg: 'bg-zinc-800 border-zinc-700 text-zinc-400',
          title: `Rang ${rank}`,
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Title & Introduction */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Palmarès & Classement Global</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Classement des Développeurs
        </h1>
        <p className="text-sm text-zinc-400">
          Découvrez les créateurs les plus populaires de l'écosystème ORAX classés par nombre de téléchargements et contributions.
        </p>
      </div>

      {/* Top 3 Podium Cards */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {topThree.map((dev, index) => {
            const rank = index + 1;
            const badge = getRankBadge(rank);
            const isFollowed = followedDevelopers.some(
              f => f.toLowerCase() === dev.name.toLowerCase() || f === dev.id
            );

            return (
              <motion.div
                key={dev.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`relative rounded-3xl p-6 sm:p-7 border flex flex-col justify-between overflow-hidden shadow-2xl transition-all hover:scale-[1.02] cursor-pointer ${
                  rank === 1
                    ? 'bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-900 border-amber-500/50 shadow-amber-500/10 ring-1 ring-amber-500/30'
                    : rank === 2
                    ? 'bg-gradient-to-b from-slate-900/40 via-zinc-900 to-zinc-900 border-slate-700 shadow-slate-500/5'
                    : 'bg-gradient-to-b from-amber-950/20 via-zinc-900 to-zinc-900 border-amber-900/60 shadow-amber-900/10'
                }`}
                onClick={() => onSelectDeveloper(dev.name)}
              >
                {/* Background glow */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Top Badge */}
                <div className="flex items-center justify-between gap-2 mb-6">
                  <span className={`text-2xl sm:text-3xl p-2 rounded-2xl border ${badge.bg}`}>
                    {badge.icon}
                  </span>
                  {dev.isLordDemon && (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      Fondateur
                    </span>
                  )}
                  {isFollowed && !dev.isLordDemon && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-500 text-zinc-950 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Suivi
                    </span>
                  )}
                </div>

                {/* Avatar & Dev Name */}
                <div className="text-center space-y-3 mb-6">
                  <div className="relative inline-block mx-auto">
                    <img
                      src={dev.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(dev.name)}`}
                      alt={dev.name}
                      className="w-20 h-20 rounded-2xl bg-zinc-950 object-cover border-2 border-zinc-700 shadow-lg mx-auto"
                    />
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs">
                      {rank === 1 ? '👑' : rank === 2 ? '⚡' : '🔥'}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 flex items-center justify-center gap-1.5 font-mono">
                      <span>{dev.name}</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{dev.role}</p>
                  </div>
                </div>

                {/* Downloads Highlight & Stats Grid */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-mono font-extrabold text-xl sm:text-2xl">
                      <Download className="w-5 h-5 stroke-[2.5]" />
                      <span>{dev.totalDownloads.toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-medium mt-0.5">téléchargements cumulés</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
                      <div className="text-white font-bold">{dev.projectsCount}</div>
                      <div className="text-[10px] text-zinc-500">Projets</div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
                      <div className="text-amber-400 font-bold flex items-center justify-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{dev.rating > 0 ? dev.rating.toFixed(1) : '-'}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">Note</div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
                      <div className="text-cyan-400 font-bold">{dev.totalViews.toLocaleString('fr-FR')}</div>
                      <div className="text-[10px] text-zinc-500">Vues</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDeveloper(dev.name);
                    }}
                    className="w-full mt-2 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-cyan-500 text-zinc-200 hover:text-zinc-950 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Voir le profil développeur</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Leaderboard Table for remaining developers */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2">
            <Medal className="w-5 h-5 text-cyan-400" />
            <span>Tableau Complet des Développeurs ({leaderboard.length})</span>
          </h2>
          <span className="text-xs text-zinc-400 font-mono">Trié par Téléchargements</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6 font-semibold w-16 text-center">Rang</th>
                <th className="py-3.5 px-4 sm:px-6 font-semibold">Développeur</th>
                <th className="py-3.5 px-4 sm:px-6 font-semibold text-center">Projets</th>
                <th className="py-3.5 px-4 sm:px-6 font-semibold text-right">Téléchargements</th>
                <th className="py-3.5 px-4 sm:px-6 font-semibold text-right">Vues</th>
                <th className="py-3.5 px-4 sm:px-6 font-semibold text-center">Note ⭐</th>
                <th className="py-3.5 px-4 sm:px-6 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {leaderboard.map((dev, i) => {
                const rank = i + 1;
                const isFollowed = followedDevelopers.some(
                  f => f.toLowerCase() === dev.name.toLowerCase() || f === dev.id
                );

                return (
                  <tr 
                    key={dev.name}
                    onClick={() => onSelectDeveloper(dev.name)}
                    className="hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 sm:px-6 text-center font-mono font-bold">
                      {rank === 1 ? (
                        <span className="text-lg">🥇</span>
                      ) : rank === 2 ? (
                        <span className="text-lg">🥈</span>
                      ) : rank === 3 ? (
                        <span className="text-lg">🥉</span>
                      ) : (
                        <span className="text-zinc-500">#{rank}</span>
                      )}
                    </td>

                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={dev.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(dev.name)}`}
                          alt={dev.name}
                          className="w-9 h-9 rounded-xl bg-zinc-950 object-cover border border-zinc-700"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-cyan-300 transition-colors font-mono">
                              {dev.name}
                            </span>
                            {dev.isLordDemon && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Fondateur
                              </span>
                            )}
                            {isFollowed && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/90 text-zinc-950 flex items-center gap-0.5">
                                <UserCheck className="w-2.5 h-2.5" />
                                Suivi
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">{dev.role}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-center font-mono text-zinc-300">
                      <span className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800">
                        {dev.projectsCount}
                      </span>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right font-mono font-bold text-emerald-400">
                      <span className="flex items-center justify-end gap-1">
                        <Download className="w-3.5 h-3.5" />
                        {dev.totalDownloads.toLocaleString('fr-FR')}
                      </span>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right font-mono text-cyan-400">
                      <span className="flex items-center justify-end gap-1">
                        <Eye className="w-3.5 h-3.5 text-zinc-500" />
                        {dev.totalViews.toLocaleString('fr-FR')}
                      </span>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-center font-mono font-semibold text-amber-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {dev.rating > 0 ? dev.rating.toFixed(1) : '0.0'}
                      </span>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDeveloper(dev.name);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 group-hover:bg-cyan-500 text-zinc-300 group-hover:text-zinc-950 transition-colors inline-flex items-center gap-1"
                      >
                        <span>Profil</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
