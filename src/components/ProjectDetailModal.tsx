import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Eye, 
  User, 
  Calendar, 
  HardDrive, 
  Share2, 
  Tag, 
  Code2, 
  ExternalLink, 
  Sparkles, 
  Check, 
  FolderGit2, 
  ShieldCheck, 
  Layers,
  Edit,
  Trash2,
  Flag,
  Star,
  MessageSquare,
  Send,
  UserPlus,
  UserCheck,
  Loader2,
  AlertCircle,
  ThumbsUp,
  Heart,
  Link as LinkIcon
} from 'lucide-react';
import { Project, UserProfile, ProjectComment } from '../types';
import { getCategoryById } from '../data/categories';
import { formatFileSize } from '../services/cloudinary';
import { 
  recordProjectDownload, 
  recordProjectView,
  rateProject,
  subscribeToProjectComments,
  addProjectComment,
  deleteProjectComment,
  toggleFollowDeveloper,
  isFollowingDeveloper,
  toggleFavoriteProject,
  isProjectFavorited,
  generateProjectSlug,
  getProjectRatingDistribution
} from '../services/firebase';
import { StarRatingDisplay, PlayStoreRatingSection } from './PlayStoreRating';
import { triggerProjectDownload } from '../utils/downloadHelper';
import { useToast } from './Toast';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
  currentUser: UserProfile | null;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onReport?: (project: Project) => void;
  onSelectDeveloper?: (developerName: string) => void;
  onOpenAuth?: () => void;
  onProjectUpdated?: (updated: Project) => void;
  onUpdateUser?: (updatedUser: UserProfile) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  onClose,
  currentUser,
  onEdit,
  onDelete,
  onReport,
  onSelectDeveloper,
  onOpenAuth,
  onProjectUpdated,
  onUpdateUser,
}) => {
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentDownloads, setCurrentDownloads] = useState(project?.downloads || 0);
  const [currentViews, setCurrentViews] = useState(project?.views || 0);
  const [currentFavoritesCount, setCurrentFavoritesCount] = useState(project?.favoritesCount || 0);

  // Rating State (Strict 0 default if unrated)
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);

  // Comments State
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState<number>(5);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');

  // Follow & Favorite States
  const [followLoading, setFollowLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setCurrentDownloads(project.downloads || 0);
      setCurrentViews(project.views || 0);
      setCurrentFavoritesCount(project.favoritesCount || 0);
      if (currentUser && project.ratings && project.ratings[currentUser.uid]) {
        setUserRating(project.ratings[currentUser.uid]);
      } else {
        setUserRating(null);
      }
    }
  }, [project?.downloads, project?.views, project?.favoritesCount, project?.ratings, currentUser?.uid]);

  useEffect(() => {
    if (project) {
      // Record view count strictly once per user account / visitor
      recordProjectView(project.id, currentUser?.uid).then((res) => {
        setCurrentViews(res.views);
        if (onProjectUpdated && res.isNew) {
          onProjectUpdated({ ...project, views: res.views });
        }
      });

      // Subscribe to real-time comments
      const unsubscribeComments = subscribeToProjectComments(project.id, (newComments) => {
        setComments(newComments);
      });

      return () => {
        unsubscribeComments();
      };
    }
  }, [project?.id, currentUser?.uid]);

  if (!project) return null;

  const categoryInfo = getCategoryById(project.category);
  const isLordDemon = project.developerName.toUpperCase().includes('LORD DEMON');
  const isOwner = currentUser && (currentUser.uid === project.ownerId || currentUser.uid === 'dev_lord_demon');
  const isFollowing = isFollowingDeveloper(project.developerName, currentUser) || isFollowingDeveloper(project.ownerId, currentUser);
  const isFavorited = isProjectFavorited(project.id, currentUser);

  // Average Rating strictly 0.0 if not rated yet
  const hasRating = Boolean(project.rating && project.rating > 0);
  const averageRating = hasRating ? project.rating! : 0.0;
  const ratingsCount = project.ratingsCount || 0;

  // Clean URL calculation
  const cleanSlug = project.slug || generateProjectSlug(project.name, project.id);
  const cleanUrl = `${window.location.origin}/#project/${cleanSlug}`;

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Récemment';
    }
  };

  const formatCommentDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Récemment';
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    showToast({
      title: 'Téléchargement lancé...',
      message: `Enregistrement du fichier ${project.fileName || project.name} sur votre appareil`,
      type: 'info',
    });

    try {
      const downloadPromise = triggerProjectDownload(project);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}

      recordProjectDownload(project.id, currentUser?.uid).then((res) => {
        setCurrentDownloads(res.downloads);
        if (onProjectUpdated && res.isNew) {
          onProjectUpdated({ ...project, downloads: res.downloads });
        }
      });

      await downloadPromise;

      setTimeout(() => {
        setDownloading(false);
        showToast({
          title: 'Téléchargement réussi !',
          message: `Le fichier "${project.fileName || project.name}" a été transmis avec succès.`,
          type: 'success',
        });
      }, 800);
    } catch (err: any) {
      setDownloading(false);
      showToast({
        title: 'Erreur lors du téléchargement',
        message: err.message || 'Impossible de télécharger le fichier.',
        type: 'error',
      });
    }
  };

  const handleRate = async (score: number) => {
    if (!currentUser) {
      showToast({
        title: 'Connexion requise',
        message: 'Vous devez être connecté pour noter un projet avec des étoiles.',
        type: 'info',
      });
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setIsRatingSubmitting(true);
    try {
      const res = await rateProject(project.id, score, currentUser);
      setUserRating(res.userRating);
      
      const updated = {
        ...project,
        rating: res.rating,
        ratingsCount: res.ratingsCount,
        ratings: { ...(project.ratings || {}), [currentUser.uid]: res.userRating }
      };

      if (onProjectUpdated) {
        onProjectUpdated(updated);
      }

      showToast({
        title: 'Merci pour votre note !',
        message: `Vous avez attribué ${score} étoile${score > 1 ? 's' : ''} à ce projet (Moyenne : ${res.rating}/5).`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Erreur de notation',
        message: err.message || 'Impossible d\'enregistrer la note.',
        type: 'error',
      });
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      showToast({
        title: 'Connexion requise',
        message: 'Connectez-vous pour ajouter ce projet à vos favoris et le retrouver facilement.',
        type: 'info',
      });
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setFavoriteLoading(true);
    try {
      const res = await toggleFavoriteProject(project.id, currentUser);
      if (onUpdateUser) {
        onUpdateUser({ ...currentUser, favorites: res.favorites });
      }

      const newFavCount = Math.max(0, currentFavoritesCount + (res.isFavorited ? 1 : -1));
      setCurrentFavoritesCount(newFavCount);

      if (onProjectUpdated) {
        onProjectUpdated({ ...project, favoritesCount: newFavCount });
      }

      showToast({
        title: res.isFavorited ? 'Ajouté aux favoris !' : 'Retiré des favoris',
        message: res.isFavorited 
          ? `Le projet "${project.name}" a été ajouté à vos favoris.`
          : `Le projet "${project.name}" a été retiré de vos favoris.`,
        type: res.isFavorited ? 'success' : 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Erreur',
        message: err.message || 'Action impossible.',
        type: 'error',
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!currentUser) {
      showToast({
        title: 'Connexion requise',
        message: 'Veuillez vous connecter pour laisser un commentaire et votre avis.',
        type: 'info',
      });
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setSubmittingComment(true);
    try {
      const newComment = await addProjectComment(
        project.id,
        commentText.trim(),
        currentUser,
        commentRating
      );

      setCommentText('');
      showToast({
        title: 'Commentaire publié !',
        message: 'Votre avis a été ajouté avec succès.',
        type: 'success',
      });

      if (commentRating) {
        setUserRating(commentRating);
      }
    } catch (err: any) {
      showToast({
        title: 'Erreur',
        message: err.message || 'Impossible de publier le commentaire.',
        type: 'error',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser) return;
    setDeletingCommentId(commentId);
    try {
      await deleteProjectComment(commentId, project.id, currentUser.uid, currentUser.isAdmin);
      showToast({
        title: 'Commentaire supprimé',
        message: 'Le commentaire a été retiré.',
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Erreur',
        message: err.message || 'Impossible de supprimer le commentaire.',
        type: 'error',
      });
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      showToast({
        title: 'Connexion requise',
        message: 'Connectez-vous pour suivre ce développeur et recevoir ses futurs projets en tête de liste.',
        type: 'info',
      });
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setFollowLoading(true);
    try {
      const res = await toggleFollowDeveloper(project.developerName, currentUser);
      if (onUpdateUser) {
        onUpdateUser({ ...currentUser, following: res.followingList });
      }

      showToast({
        title: res.isFollowing ? 'Développeur suivi !' : 'Désabonné',
        message: res.isFollowing
          ? `Vous suivez désormais ${project.developerName}. Ses projets s'afficheront tout en haut de votre catalogue.`
          : `Vous ne suivez plus ${project.developerName}.`,
        type: res.isFollowing ? 'success' : 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Erreur',
        message: err.message || 'Action impossible.',
        type: 'error',
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(cleanUrl);
    setCopied(true);
    showToast({
      title: 'URL propre copiée !',
      message: `Lien SEO copié : ${cleanUrl}`,
      type: 'success',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col"
      >
        {/* Header Bar with close & actions */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${categoryInfo.badgeBg}`}>
              {categoryInfo.name}
            </span>
            {project.version && (
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-300">
                v{project.version}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Favorite Toggle Button */}
            <button
              type="button"
              id="btn-favorite-modal"
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isFavorited
                  ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-rose-400 border-zinc-700'
              }`}
              title={isFavorited ? 'Retirer des favoris' : 'Mettre en favoris'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-white stroke-white' : ''}`} />
              <span className="hidden xs:inline">{isFavorited ? 'Favori' : 'Ajouter aux favoris'}</span>
            </button>

            {/* Clean URL / Share Button */}
            <button
              id="btn-copy-project-link"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs transition-colors"
              title="Copier l'URL propre du projet"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="hidden sm:inline font-mono">URL Propre</span>
            </button>

            {onReport && (
              <button
                id="btn-report-project-modal"
                onClick={() => onReport(project)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-300 border border-zinc-700 hover:border-rose-800/50 text-xs transition-colors"
                title="Signaler ce projet"
              >
                <Flag className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Signaler</span>
              </button>
            )}

            {isOwner && (
              <>
                {onEdit && (
                  <button
                    id="btn-edit-project-modal"
                    onClick={() => onEdit(project)}
                    className="p-2 rounded-xl bg-zinc-800/80 hover:bg-cyan-950 text-cyan-400 hover:border-cyan-500/40 border border-transparent transition-colors"
                    title="Modifier ce projet / Nouvelle version"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    id="btn-delete-project-modal"
                    onClick={() => onDelete(project)}
                    className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950 text-rose-400 hover:border-rose-500/40 border border-transparent transition-colors"
                    title="Supprimer ce projet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            <button
              id="btn-close-project-modal"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Description vs Notes et Avis Play Store) */}
        <div className="flex items-center gap-1 px-5 sm:px-8 border-b border-zinc-800 bg-zinc-950/40 shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold font-mono border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Détails & Fichiers</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold font-mono border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'comments'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>Notes et avis ({ratingsCount})</span>
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-8 flex-1">
          
          {/* Top Banner Image, Developer Card, and Title */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {project.name}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-400">
                {/* Highly Visible Clickable Developer Profile Card */}
                <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border transition-all ${
                  isLordDemon 
                    ? 'bg-gradient-to-r from-cyan-950/80 via-zinc-950 to-blue-950/80 border-cyan-500/60 shadow-lg shadow-cyan-500/10' 
                    : 'bg-zinc-950/90 border-zinc-800'
                }`}>
                  <span className="text-zinc-400 font-mono text-xs font-semibold">Développeur :</span>
                  <button
                    type="button"
                    onClick={() => onSelectDeveloper && onSelectDeveloper(project.developerName)}
                    className={`font-mono font-extrabold text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                      isLordDemon 
                        ? 'text-cyan-300 hover:text-white' 
                        : 'text-zinc-100 hover:text-cyan-400'
                    }`}
                    title="Ouvrir le profil développeur"
                  >
                    <User className={`w-4 h-4 ${isLordDemon ? 'text-cyan-400' : 'text-zinc-400'}`} />
                    <span className="tracking-wide">{project.developerName}</span>
                    {isLordDemon && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 shadow-sm flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-300" />
                        Fondateur
                      </span>
                    )}
                  </button>

                  {/* Follow button in modal */}
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className={`ml-2 px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                      isFollowing
                        ? 'bg-zinc-800 text-cyan-300 border border-zinc-700 hover:bg-rose-950/80 hover:text-rose-300'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 hover:shadow-cyan-500/30'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Abonné</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Suivre</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-zinc-400 text-xs bg-zinc-950/70 px-3 py-2 rounded-2xl border border-zinc-800/80">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Publié le {formatDate(project.createdAt)}</span>
                </div>
              </div>

              {/* Technologies list */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {project.technologies.map((tech, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800 text-cyan-300 border border-zinc-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Thumbnail preview */}
            <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 relative shadow-inner">
              <img
                src={project.thumbnail}
                alt={project.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg text-xs font-mono bg-black/80 backdrop-blur-sm text-zinc-300 border border-zinc-700">
                {formatFileSize(project.fileSize)}
              </div>
            </div>
          </div>

          {/* Clean URL Permalink Banner */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate max-w-md text-zinc-400 font-mono">
              <LinkIcon className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-zinc-500">URL :</span>
              <span className="text-zinc-300 truncate">{cleanUrl}</span>
            </div>

            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-cyan-500 text-zinc-200 hover:text-zinc-950 font-mono font-bold transition-all text-xs flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Partager'}</span>
            </button>
          </div>

          {/* Quick Metrics & Download Bar */}
          <div className="bg-zinc-950/80 p-4 sm:p-5 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4 sm:gap-6 text-sm font-mono flex-wrap">
              
              {/* Rating Metric - Clickable to jump to Play Store ratings tab */}
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className="flex items-center gap-2 text-amber-400 hover:scale-105 transition-transform text-left"
                title="Voir le détail des notes Play Store"
              >
                <Star className={`w-5 h-5 ${hasRating ? 'fill-amber-400' : 'text-zinc-600'}`} />
                <div>
                  <div className="font-bold text-base text-white">{averageRating.toFixed(1)} / 5</div>
                  <div className="text-[11px] text-zinc-400 uppercase">({ratingsCount} avis)</div>
                </div>
              </button>

              <div className="w-[1px] h-8 bg-zinc-800 hidden sm:block" />

              {/* Downloads Metric */}
              <div className="flex items-center gap-2 text-emerald-400">
                <Download className="w-5 h-5" />
                <div>
                  <div className="font-bold text-base text-white">{currentDownloads.toLocaleString('fr-FR')}</div>
                  <div className="text-[11px] text-zinc-400 uppercase">Téléchargements</div>
                </div>
              </div>

              <div className="w-[1px] h-8 bg-zinc-800 hidden sm:block" />

              {/* Views Metric */}
              <div className="flex items-center gap-2 text-cyan-400">
                <Eye className="w-5 h-5" />
                <div>
                  <div className="font-bold text-base text-white">{currentViews.toLocaleString('fr-FR')}</div>
                  <div className="text-[11px] text-zinc-400 uppercase">Vues</div>
                </div>
              </div>

              <div className="w-[1px] h-8 bg-zinc-800 hidden sm:block" />

              {/* Favorites Metric */}
              <div className="flex items-center gap-2 text-rose-400">
                <Heart className="w-5 h-5 fill-rose-400" />
                <div>
                  <div className="font-bold text-base text-white">{currentFavoritesCount}</div>
                  <div className="text-[11px] text-zinc-400 uppercase">Favoris</div>
                </div>
              </div>
            </div>

            {/* Main Download Button */}
            <button
              id="btn-download-project-main"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Download className={`w-5 h-5 stroke-[2.5] ${downloading ? 'animate-bounce' : ''}`} />
              <span>{downloading ? 'Téléchargement...' : 'TÉLÉCHARGER LE PROJET'}</span>
            </button>
          </div>

          {/* Tab 1: Description & Documentation */}
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* Description Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-2 font-mono flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  Description & Documentation
                </h3>

                <div className="prose prose-invert max-w-none text-zinc-300 text-sm sm:text-base leading-relaxed bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/60 whitespace-pre-line font-sans">
                  {project.description}
                </div>
              </div>

              {/* Dedicated Developer Attribution Banner */}
              <div className={`p-5 sm:p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-5 transition-all ${
                isLordDemon
                  ? 'bg-gradient-to-br from-cyan-950/60 via-zinc-950 to-blue-950/60 border-cyan-500/50 shadow-xl shadow-cyan-500/5'
                  : 'bg-zinc-950/80 border-zinc-800'
              }`}>
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold text-xl shrink-0 shadow-lg">
                    {project.developerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-mono text-zinc-400 font-medium">Développeur & Concepteur :</div>
                    <div className="text-lg sm:text-xl font-extrabold text-white font-mono flex items-center gap-2 mt-0.5">
                      <span>{project.developerName}</span>
                      {isLordDemon && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3 h-3 text-cyan-300" />
                          Créateur ORAX
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {isLordDemon 
                        ? 'Fondateur & Lead Developer officiel de la plateforme ORAX PROJET.' 
                        : `Développeur vérifié sur l'écosystème ORAX PROJET.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectDeveloper && onSelectDeveloper(project.developerName)}
                  className="px-5 py-2.5 rounded-xl font-mono font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-md shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-2 shrink-0"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Voir le profil de {project.developerName}</span>
                </button>
              </div>

              {/* Tags & Metadata */}
              {project.tags && project.tags.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-zinc-500" />
                    Mots-clés / Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800/60 text-zinc-300 border border-zinc-700/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* File details container */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 space-y-2">
                <div className="flex justify-between items-center">
                  <span>Nom du fichier archive :</span>
                  <span className="text-zinc-200 font-semibold truncate max-w-[200px]">{project.fileName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Poids du téléchargement :</span>
                  <span className="text-cyan-400">{formatFileSize(project.fileSize)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Dernière mise à jour :</span>
                  <span className="text-zinc-300">{formatDate(project.updatedAt)}</span>
                </div>

                {/* Direct Link Alternate Trigger */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-sans">Lien de secours direct :</span>
                  {project.fileUrl && (project.fileUrl.startsWith('http://') || project.fileUrl.startsWith('https://')) ? (
                    <a
                      href={project.fileUrl}
                      download={project.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline font-sans flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Téléchargement direct</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline font-sans flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Lancer l'archive</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Play Store Rating Teaser Card */}
              <div className="p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-white font-mono flex items-center justify-center sm:justify-start gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Avis & Notes Google Play Store ({ratingsCount})</span>
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Consultez la répartition détaillée des étoiles et les retours des développeurs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('comments')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 text-zinc-200 border border-zinc-700 transition-all font-mono flex items-center gap-2"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Voir le tableau des notes</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Full Google Play Store Ratings & Reviews System */}
          {activeTab === 'comments' && (
            <PlayStoreRatingSection
              project={project}
              currentUser={currentUser}
              comments={comments}
              onProjectUpdated={(up) => {
                if (onProjectUpdated) onProjectUpdated(up);
              }}
              onOpenAuth={onOpenAuth}
              onCommentsUpdated={(updatedComments) => {
                setComments(updatedComments);
              }}
            />
          )}

        </div>
      </motion.div>
    </div>
  );
};
