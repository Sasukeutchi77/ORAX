import React, { useState, useMemo } from 'react';
import { 
  X, 
  User, 
  Download, 
  Eye, 
  Star, 
  FolderGit2, 
  Sparkles, 
  UserCheck, 
  UserPlus, 
  Search, 
  Share2, 
  Check,
  ShieldCheck,
  ArrowRight,
  Code2
} from 'lucide-react';
import { Project, UserProfile, DeveloperInfo } from '../types';
import { getDeveloperInfo, toggleFollowDeveloper, isFollowingDeveloper } from '../services/firebase';
import { ProjectCard } from './ProjectCard';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'motion/react';

interface DeveloperProfileModalProps {
  developerIdentifier: string | null;
  allProjects: Project[];
  currentUser: UserProfile | null;
  onClose: () => void;
  onSelectProject: (project: Project) => void;
  onOpenAuth: () => void;
  onUpdateUser?: (updatedUser: UserProfile) => void;
}

export const DeveloperProfileModal: React.FC<DeveloperProfileModalProps> = ({
  developerIdentifier,
  allProjects,
  currentUser,
  onClose,
  onSelectProject,
  onOpenAuth,
  onUpdateUser,
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const devInfo: DeveloperInfo | null = useMemo(() => {
    if (!developerIdentifier) return null;
    return getDeveloperInfo(developerIdentifier, allProjects);
  }, [developerIdentifier, allProjects]);

  const isFollowing = useMemo(() => {
    if (!devInfo) return false;
    return isFollowingDeveloper(devInfo.name, currentUser) || isFollowingDeveloper(devInfo.id, currentUser);
  }, [devInfo, currentUser]);

  if (!developerIdentifier || !devInfo) return null;

  const filteredDevProjects = devInfo.projects.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.technologies.some(t => t.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  });

  const handleToggleFollow = async () => {
    if (!currentUser) {
      showToast({
        title: 'Connexion requise',
        message: 'Veuillez vous connecter pour suivre ce développeur et recevoir ses projets en priorité.',
        type: 'info',
      });
      onOpenAuth();
      return;
    }

    setIsFollowLoading(true);
    try {
      const res = await toggleFollowDeveloper(devInfo.name, currentUser);
      if (onUpdateUser) {
        onUpdateUser({ ...currentUser, following: res.followingList });
      }

      showToast({
        title: res.isFollowing ? 'Abonnement activé !' : 'Désabonné',
        message: res.isFollowing 
          ? `Vous suivez maintenant ${devInfo.name}. Ses projets apparaîtront tout en haut de votre catalogue.`
          : `Vous ne suivez plus ${devInfo.name}.`,
        type: res.isFollowing ? 'success' : 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Erreur',
        message: err.message || 'Impossible de mettre à jour le suivi.',
        type: 'error',
      });
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast({
      title: 'Lien copié !',
      message: `Profil de ${devInfo.name} copié dans le presse-papier.`,
      type: 'info',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Profil Développeur
            </span>
            {devInfo.isLordDemon && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Fondateur ORAX
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-share-dev-profile"
              onClick={handleShare}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Partager le profil"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              id="btn-close-dev-profile"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-8 flex-1">
          
          {/* Main Developer Profile Card - Custom Styled as specified */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 border-2 border-zinc-800 p-6 sm:p-8 shadow-2xl">
            {/* Ambient background glow */}
            <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${devInfo.isLordDemon ? 'bg-cyan-500/15' : 'bg-emerald-500/10'}`} />

            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative z-10 text-center sm:text-left">
              
              {/* Avatar & Name & Role */}
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  <img
                    src={devInfo.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(devInfo.name)}`}
                    alt={devInfo.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-950 object-cover border-2 border-cyan-500/40 shadow-xl"
                  />
                  {devInfo.isLordDemon && (
                    <div className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-cyan-500 text-zinc-950 shadow-lg" title="Fondateur ORAX">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                      {devInfo.name}
                    </h1>
                    {devInfo.isLordDemon && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        Vérifié
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-cyan-400 font-mono">
                    {devInfo.role}
                  </p>

                  {devInfo.bio && (
                    <p className="text-xs text-zinc-300 max-w-md mt-1 leading-relaxed">
                      {devInfo.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Follow Button */}
              <div className="shrink-0 flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                <button
                  id="btn-toggle-follow-developer"
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all transform active:scale-95 shadow-xl ${
                    isFollowing
                      ? 'bg-zinc-800 hover:bg-rose-950/80 text-zinc-200 hover:text-rose-300 border border-zinc-700 hover:border-rose-800/60'
                      : 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-zinc-950 shadow-cyan-500/25'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 text-cyan-400" />
                      <span>Suivi (Abonné)</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 stroke-[2.5]" />
                      <span>Suivre</span>
                    </>
                  )}
                </button>

                <span className="text-[11px] font-mono text-zinc-400">
                  {isFollowing ? 'Ses projets s\'affichent en haut' : 'Recevez ses projets en priorité'}
                </span>
              </div>
            </div>

            {/* Metrics Breakdown Grid (24 projets, 15 420 téléchargements, ⭐ 4.8) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-zinc-800/80 font-mono">
              
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs mb-1">
                  <FolderGit2 className="w-4 h-4 text-cyan-400" />
                  <span>Projets</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {devInfo.projectsCount}
                </div>
                <div className="text-[10px] text-zinc-400">publiés</div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs mb-1">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Téléchargements</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-400">
                  {devInfo.totalDownloads.toLocaleString('fr-FR')}
                </div>
                <div className="text-[10px] text-zinc-400">au total</div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs mb-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Note Moyenne</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-amber-400 flex items-center justify-center gap-1">
                  <span>⭐ {devInfo.rating.toFixed(1)}</span>
                </div>
                <div className="text-[10px] text-zinc-400">({devInfo.ratingsCount} avis)</div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs mb-1">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span>Vues totales</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-zinc-200">
                  {devInfo.totalViews.toLocaleString('fr-FR')}
                </div>
                <div className="text-[10px] text-zinc-400">consultations</div>
              </div>

            </div>
          </div>

          {/* Section: Ses projets */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-xl font-black text-white font-mono flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-cyan-400" />
                  Ses projets
                </h2>
                <p className="text-xs text-zinc-400">
                  Tous les projets et outils partagés par {devInfo.name} ({devInfo.projects.length})
                </p>
              </div>

              {/* In-profile search */}
              {devInfo.projects.length > 2 && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer ses projets..."
                    className="w-full bg-zinc-950 text-xs text-white pl-9 pr-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Projects Grid */}
            {filteredDevProjects.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-500 space-y-2">
                <FolderGit2 className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-400">Aucun projet ne correspond à votre recherche.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {filteredDevProjects.map((project, idx) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      onClose();
                      onSelectProject(project);
                    }}
                    className="cursor-pointer"
                  >
                    <ProjectCard
                      project={project}
                      onSelect={(p) => {
                        onClose();
                        onSelectProject(p);
                      }}
                      index={idx}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>ORAX PROJET • Communauté de Développeurs</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-sans transition-colors"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
};
