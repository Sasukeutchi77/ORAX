import React from 'react';
import { 
  Download, 
  Eye, 
  User, 
  Calendar, 
  HardDrive, 
  ArrowUpRight, 
  Sparkles, 
  ExternalLink,
  Code,
  Star,
  UserCheck,
  Heart
} from 'lucide-react';
import { Project, UserProfile } from '../types';
import { getCategoryById } from '../data/categories';
import { formatFileSize } from '../services/cloudinary';
import { isProjectFavorited } from '../services/firebase';
import { motion } from 'motion/react';

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  onSelectDeveloper?: (developerName: string) => void;
  onToggleFavorite?: (e: React.MouseEvent, project: Project) => void;
  onQuickDownload?: (e: React.MouseEvent, project: Project) => void;
  isFollowedDeveloper?: boolean;
  currentUser?: UserProfile | null;
  index?: number;
}

const ProjectCardComponent: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onSelectDeveloper,
  onToggleFavorite,
  onQuickDownload,
  isFollowedDeveloper = false,
  currentUser = null,
  index = 0,
}) => {
  const categoryInfo = getCategoryById(project.category);
  const isLordDemon = project.developerName.toUpperCase().includes('LORD DEMON');

  // Rating: Strictly start from 0 if not yet rated by community
  const hasRating = project.rating && project.rating > 0;
  const ratingValue = hasRating ? project.rating!.toFixed(1) : '0.0';

  const isFavorited = isProjectFavorited(project.id, currentUser);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Récemment';
    }
  };

  const handleDevClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectDeveloper) {
      onSelectDeveloper(project.developerName);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(e, project);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
      id={`project-card-${project.id}`}
      onClick={() => onSelect(project)}
      className={`group relative flex flex-col bg-zinc-900/80 hover:bg-zinc-900 border rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer ${
        isFollowedDeveloper 
          ? 'border-cyan-500/60 ring-1 ring-cyan-500/30' 
          : 'border-zinc-800/90 hover:border-cyan-500/50'
      }`}
    >
      {/* Top Banner Thumbnail */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-zinc-950">
        <img
          src={project.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'}
          alt={project.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30" />

        {/* Category & Badges Pill */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 max-w-[70%]">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-md shadow-md ${categoryInfo.badgeBg}`}>
            {categoryInfo.name}
          </span>
          {isFollowedDeveloper && (
            <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/90 text-zinc-950 shadow-md backdrop-blur-md flex items-center gap-1">
              <UserCheck className="w-3 h-3 stroke-[2.5]" />
              Suivi
            </span>
          )}
          {project.featured && !isFollowedDeveloper && (
            <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Top
            </span>
          )}
        </div>

        {/* Top Right Action: Favorite button & Rating Score */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {/* Favorite Toggle Button */}
          {onToggleFavorite && (
            <button
              type="button"
              id={`favorite-btn-${project.id}`}
              onClick={handleFavoriteClick}
              title={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className={`p-1.5 rounded-lg backdrop-blur-md transition-all active:scale-90 shadow-md border ${
                isFavorited
                  ? 'bg-rose-500 text-white border-rose-400'
                  : 'bg-black/60 text-zinc-300 hover:text-rose-400 border-zinc-700/60 hover:bg-black/80'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-white stroke-white' : ''}`} />
            </button>
          )}

          {/* Rating Score Badge */}
          <div className="px-2 py-1 rounded-lg text-[11px] font-mono font-bold bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-md">
            <Star className={`w-3.5 h-3.5 ${hasRating ? 'text-amber-400 fill-amber-400' : 'text-zinc-500'}`} />
            <span>{ratingValue}</span>
          </div>
        </div>

        {/* File Size Badge */}
        <div className="absolute bottom-2.5 left-3 px-2 py-1 rounded-lg text-[10px] font-mono bg-zinc-950/80 backdrop-blur-md text-zinc-300 border border-zinc-700/60 flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-cyan-400" />
          <span>{formatFileSize(project.fileSize)}</span>
        </div>

        {/* Version tag */}
        {project.version && (
          <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-950/80 text-zinc-400 border border-zinc-800">
            v{project.version}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Title */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
              {project.name}
            </h3>
            <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
          </div>

          {/* Short description */}
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
            {project.shortDescription || project.description.replace(/[#*`_]/g, '')}
          </p>

          {/* Developer tag - Highly visible & clickable */}
          <div className="mt-3.5 flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-mono text-zinc-400 shrink-0 font-medium">Dev :</span>
              <button
                type="button"
                onClick={handleDevClick}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all truncate hover:scale-105 active:scale-95 ${
                  isLordDemon 
                    ? 'text-cyan-200 bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border border-cyan-500/60 shadow-sm shadow-cyan-500/20 hover:border-cyan-400 hover:text-white' 
                    : 'text-zinc-200 bg-zinc-800/90 hover:bg-zinc-700 hover:text-white border border-zinc-700/80'
                }`}
                title={`Voir le profil complet de ${project.developerName}`}
              >
                <User className={`w-3.5 h-3.5 shrink-0 ${isLordDemon ? 'text-cyan-400' : 'text-zinc-400'}`} />
                <span className="truncate">{project.developerName}</span>
                {isLordDemon && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-extrabold bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-inner">
                    Fondateur
                  </span>
                )}
              </button>
            </div>

            {project.verified && (
              <span className="text-[10px] font-mono text-cyan-400 shrink-0 flex items-center gap-0.5 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/60" title="Projet Vérifié">
                ✓ Vérifié
              </span>
            )}
          </div>

          {/* Technologies stack */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 3).map((tech, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-zinc-800/80 text-zinc-300 border border-zinc-700/50"
              >
                {tech}
              </span>
            ))}
            {project.technologies.length > 3 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800/50 text-zinc-400">
                +{project.technologies.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Footer info: Downloads, Rating stars count, and button */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-400" title="Téléchargements">
              <Download className="w-3.5 h-3.5" />
              <span>{project.downloads.toLocaleString('fr-FR')}</span>
            </span>
            <span className="flex items-center gap-1 text-amber-400" title="Note et avis">
              <Star className={`w-3.5 h-3.5 ${hasRating ? 'fill-amber-400' : 'text-zinc-500'}`} />
              <span>{ratingValue}</span>
            </span>
            {project.favoritesCount !== undefined && project.favoritesCount > 0 && (
              <span className="flex items-center gap-1 text-rose-400" title="Favoris">
                <Heart className="w-3.5 h-3.5 fill-rose-400" />
                <span>{project.favoritesCount}</span>
              </span>
            )}
          </div>

          <button
            id={`btn-view-${project.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(project);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 group-hover:bg-cyan-500 text-zinc-200 group-hover:text-zinc-950 transition-all flex items-center gap-1"
          >
            <span>Voir le projet</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const ProjectCard = React.memo(ProjectCardComponent);
