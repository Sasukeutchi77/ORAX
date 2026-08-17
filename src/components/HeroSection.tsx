import React from 'react';
import { 
  Sparkles, 
  Upload, 
  ArrowRight, 
  Download, 
  Eye, 
  FolderGit2, 
  Search, 
  ShieldCheck, 
  Terminal, 
  Zap, 
  Code
} from 'lucide-react';
import { motion } from 'motion/react';

interface HeroSectionProps {
  totalProjects: number;
  totalDownloads: number;
  onExplore: () => void;
  onPublish: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  totalProjects,
  totalDownloads,
  onExplore,
  onPublish,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit();
    }
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-zinc-900 bg-tech-grid bg-radial-gradient">
      {/* Glow shapes */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          
          {/* Badge & Creator tag */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-6 shadow-inner"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>ORAX PROJET</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-sans">
              Développé & Conçu par <strong className="text-white font-mono font-extrabold text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-700/50">LORD DEMON</strong>
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]"
          >
            Partagez. Découvrez.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
              Téléchargez.
            </span>{' '}
            Créez.
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-5 text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed"
          >
            <strong className="text-white font-semibold">ORAX PROJET</strong> est une plateforme dédiée au partage et à la découverte de projets numériques, bots, codes sources et utilitaires logiciels.
          </motion.p>

          {/* Hero Search Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 max-w-xl mx-auto"
          >
            <div className="relative flex items-center bg-zinc-900/90 p-1.5 sm:p-2 rounded-2xl border border-zinc-800 shadow-2xl focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
              <Search className="w-5 h-5 text-zinc-400 ml-3 shrink-0" />
              <input
                id="hero-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher : Telegram bot, Flutter, Python, Web..."
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-zinc-500 px-3 py-2 focus:outline-none"
              />
              <button
                id="hero-search-btn"
                onClick={onSearchSubmit}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs sm:text-sm transition-all shrink-0 flex items-center gap-1.5"
              >
                <span>Rechercher</span>
                <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
              </button>
            </div>
          </motion.div>

          {/* Call to actions */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            <button
              id="hero-explore-btn"
              onClick={onExplore}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm sm:text-base bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all transform active:scale-95"
            >
              <FolderGit2 className="w-5 h-5" />
              <span>EXPLORER LES PROJETS</span>
            </button>

            <button
              id="hero-publish-btn"
              onClick={onPublish}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm sm:text-base bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 hover:border-zinc-600 transition-all transform active:scale-95"
            >
              <Upload className="w-5 h-5 text-cyan-400" />
              <span>PUBLIER UN PROJET</span>
            </button>
          </motion.div>

          {/* Live Metrics Row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto"
          >
            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-cyan-400 font-mono">
                {totalProjects}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Projet{totalProjects > 1 ? 's' : ''} Disponible{totalProjects > 1 ? 's' : ''}</p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
                {totalDownloads.toLocaleString('fr-FR')}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Téléchargement{totalDownloads > 1 ? 's' : ''}</p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-violet-400 font-mono">
                9
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Catégories Tech</p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono">
                100%
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Accès Direct Cloud</p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
