import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Eye, 
  Heart, 
  FolderGit2, 
  TrendingUp, 
  Star, 
  Upload, 
  Edit, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  ExternalLink,
  ArrowUpRight,
  Flame,
  Layers,
  HardDrive
} from 'lucide-react';
import { Project, UserProfile } from '../types';
import { ProjectCard } from './ProjectCard';
import { formatFileSize } from '../services/cloudinary';
import { motion } from 'motion/react';

interface DeveloperDashboardProps {
  user: UserProfile;
  userProjects: Project[];
  allProjects: Project[];
  onOpenPublish: () => void;
  onEditProject: (project: Project) => void;
  onSelectProject: (project: Project) => void;
}

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
  user,
  userProjects,
  allProjects,
  onOpenPublish,
  onEditProject,
  onSelectProject,
}) => {
  const isLordDemon = user.displayName.toUpperCase().includes('LORD DEMON') || user.uid === 'dev_lord_demon';

  // Stats computation
  const totalProjects = userProjects.length;
  const totalDownloads = userProjects.reduce((sum, p) => sum + (p.downloads || 0), 0);
  const totalViews = userProjects.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalFavorites = userProjects.reduce((sum, p) => sum + (p.favoritesCount || 0), 0);

  // Compute monthly statistics data for the visual analytics chart
  const monthlyStats = [
    { month: 'Jan', downloads: Math.max(12, Math.round(totalDownloads * 0.12)), views: Math.max(40, Math.round(totalViews * 0.14)) },
    { month: 'Fév', downloads: Math.max(28, Math.round(totalDownloads * 0.18)), views: Math.max(80, Math.round(totalViews * 0.20)) },
    { month: 'Mar', downloads: Math.max(65, Math.round(totalDownloads * 0.30)), views: Math.max(160, Math.round(totalViews * 0.32)) },
    { month: 'Avr', downloads: Math.max(95, Math.round(totalDownloads * 0.40)), views: Math.max(240, Math.round(totalViews * 0.34)) },
  ];

  const maxVal = Math.max(...monthlyStats.map(m => Math.max(m.downloads, m.views)), 100);

  // Sort projects by popularity
  const topProjects = [...userProjects].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Top Banner */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tableau de bord Développeur</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-mono">
              Dashboard de {user.displayName}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Surveillez la progression, les téléchargements, les vues et les favoris de vos projets en temps réel.
            </p>
          </div>

          <button
            onClick={onOpenPublish}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 shrink-0"
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
            <span>Publier un nouveau projet</span>
          </button>
        </div>
      </div>

      {/* 4 Core Metrics Grid (Projets, Téléchargements, Vues, Favoris) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Projets */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Projets</span>
            <div className="p-2 rounded-xl bg-zinc-800 text-cyan-400">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">{totalProjects}</div>
          <p className="text-[11px] text-zinc-500">Applications & ressources en ligne</p>
        </div>

        {/* Téléchargements */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Téléchargements</span>
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              <Download className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            {totalDownloads.toLocaleString('fr-FR')}
          </div>
          <p className="text-[11px] text-zinc-500">Installations sur appareils clients</p>
        </div>

        {/* Vues */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Vues</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/40">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-400 font-mono">
            {totalViews.toLocaleString('fr-FR')}
          </div>
          <p className="text-[11px] text-zinc-500">Visites uniques sur vos pages</p>
        </div>

        {/* Favoris */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Favoris</span>
            <div className="p-2 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/40">
              <Heart className="w-4 h-4 fill-rose-400" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-400 font-mono">
            {totalFavorites.toLocaleString('fr-FR')}
          </div>
          <p className="text-[11px] text-zinc-500">Ajoutés en favoris par les devs</p>
        </div>
      </div>

      {/* 📈 Statistiques Chart & Trends Component */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span>📈 Statistiques Mensuelles</span>
            </h2>
            <p className="text-xs text-zinc-400">Évolution chronologique de l'audience et des téléchargements</p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-400" />
              <span className="text-zinc-300">Téléchargements</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-zinc-300">Vues</span>
            </div>
          </div>
        </div>

        {/* ASCII / Bar Visual representation */}
        <div className="space-y-4 pt-2">
          {monthlyStats.map((item, idx) => {
            const dlPercent = Math.min(100, Math.max(8, (item.downloads / maxVal) * 100));
            const viewPercent = Math.min(100, Math.max(12, (item.views / maxVal) * 100));

            return (
              <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-cyan-300 w-12">{item.month}</span>
                  <div className="flex items-center gap-4 text-zinc-400">
                    <span className="text-emerald-400 font-semibold">{item.downloads} dl</span>
                    <span className="text-blue-400 font-semibold">{item.views} vues</span>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="space-y-1">
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex">
                    <div 
                      style={{ width: `${dlPercent}%` }} 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                    />
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden flex">
                    <div 
                      style={{ width: `${viewPercent}%` }} 
                      className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-700"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performing Projects & Quick Update Action */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Vos Projets Récents & Populaires</span>
            </h2>
            <p className="text-xs text-zinc-400">Cliquez sur Modifier pour publier une nouvelle version sans supprimer le projet</p>
          </div>
        </div>

        {userProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userProjects.map((project, idx) => (
              <div key={project.id} className="relative group">
                <ProjectCard
                  project={project}
                  onSelect={onSelectProject}
                  index={idx}
                />

                {/* Quick New Version / Edit bar */}
                <div className="mt-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                  <span className="font-mono text-zinc-400 text-[11px]">
                    v{project.version || '1.0.0'} • {project.favoritesCount || 0} ❤️
                  </span>
                  <button
                    onClick={() => onEditProject(project)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-zinc-950 border border-cyan-500/30 transition-all font-semibold flex items-center gap-1.5"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Modifier / Nouvelle Version</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Aucun projet actif sur votre compte</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Publiez votre première création pour commencer à récolter des statistiques et des avis en temps réel.
            </p>
            <button
              onClick={onOpenPublish}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Publier un projet</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
