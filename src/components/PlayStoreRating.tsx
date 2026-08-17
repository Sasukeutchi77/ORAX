import React, { useState } from 'react';
import { 
  Star, 
  ThumbsUp, 
  CornerDownRight, 
  Trash2, 
  Edit3, 
  MessageSquare, 
  Send, 
  Check, 
  X, 
  Sparkles,
  AlertCircle,
  HelpCircle,
  Filter
} from 'lucide-react';
import { Project, UserProfile, ProjectComment } from '../types';
import { 
  getProjectRatingDistribution, 
  rateProject, 
  deleteProjectRating,
  toggleCommentHelpful,
  replyToProjectComment,
  editProjectComment,
  deleteProjectComment
} from '../services/firebase';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'motion/react';

const STAR_LABELS: Record<number, string> = {
  1: 'Médiocre / Décevant',
  2: 'Passable',
  3: 'Moyen / Correct',
  4: 'Très bon',
  5: 'Excellent !',
};

interface StarRatingDisplayProps {
  rating: number;
  maxStars?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showNumber?: boolean;
  ratingsCount?: number;
  className?: string;
}

export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({
  rating,
  maxStars = 5,
  size = 'md',
  showNumber = false,
  ratingsCount,
  className = '',
}) => {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  const starSize = sizeMap[size] || sizeMap.md;
  const isUnrated = !rating || rating <= 0;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5" title={`${rating.toFixed(1)} sur 5`}>
        {Array.from({ length: maxStars }).map((_, idx) => {
          const starIndex = idx + 1;
          // Calculate fill percentage for each star
          const fillPercentage = Math.max(0, Math.min(1, rating - idx));

          if (isUnrated) {
            return (
              <Star
                key={idx}
                className={`${starSize} text-zinc-700`}
                strokeWidth={1.5}
              />
            );
          }

          if (fillPercentage >= 0.8) {
            // Full star
            return (
              <Star
                key={idx}
                className={`${starSize} text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.25)]`}
                strokeWidth={1.5}
              />
            );
          } else if (fillPercentage >= 0.25) {
            // Half star representation
            return (
              <div key={idx} className="relative inline-block">
                <Star className={`${starSize} text-zinc-700`} strokeWidth={1.5} />
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${Math.round(fillPercentage * 100)}%` }}
                >
                  <Star className={`${starSize} text-amber-400 fill-amber-400`} strokeWidth={1.5} />
                </div>
              </div>
            );
          } else {
            // Empty star
            return (
              <Star
                key={idx}
                className={`${starSize} text-zinc-700`}
                strokeWidth={1.5}
              />
            );
          }
        })}
      </div>

      {showNumber && (
        <span className="text-xs font-mono font-bold text-zinc-200 ml-1">
          {rating > 0 ? rating.toFixed(1) : '0.0'}
        </span>
      )}

      {ratingsCount !== undefined && (
        <span className="text-[11px] text-zinc-400 font-mono">
          ({ratingsCount.toLocaleString('fr-FR')})
        </span>
      )}
    </div>
  );
};

interface PlayStoreRatingSectionProps {
  project: Project;
  currentUser: UserProfile | null;
  comments: ProjectComment[];
  onProjectUpdated?: (updated: Project) => void;
  onOpenAuth?: () => void;
  onCommentsUpdated?: (updatedComments: ProjectComment[]) => void;
}

export const PlayStoreRatingSection: React.FC<PlayStoreRatingSectionProps> = ({
  project,
  currentUser,
  comments,
  onProjectUpdated,
  onOpenAuth,
  onCommentsUpdated,
}) => {
  const { showToast } = useToast();

  // Local state for distribution
  const distribution = getProjectRatingDistribution(project);
  
  // User's own rating
  const userScore = currentUser && project.ratings ? project.ratings[currentUser.uid] || null : null;

  // Interactive rate states
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);

  // Review Form state
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(userScore || 5);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Filter & Sort for reviews
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'highest' | 'lowest'>('recent');

  // Developer reply state
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Edit comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentRating, setEditCommentRating] = useState<number>(5);

  const isOwnerOrAdmin = currentUser && (
    currentUser.uid === project.ownerId || 
    currentUser.isAdmin || 
    currentUser.uid === 'dev_lord_demon' ||
    currentUser.displayName.toUpperCase().includes('LORD DEMON')
  );

  // Filtered comments
  const filteredComments = comments.filter((c) => {
    if (starFilter === 'all') return true;
    return c.rating === starFilter;
  }).sort((a, b) => {
    if (sortBy === 'helpful') {
      return (b.helpfulCount || 0) - (a.helpfulCount || 0);
    }
    if (sortBy === 'highest') {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (sortBy === 'lowest') {
      return (a.rating || 0) - (b.rating || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleRateClick = async (star: number) => {
    if (!currentUser) {
      showToast({
        title: 'Connexion requise',
        message: 'Connectez-vous pour évaluer ce projet.',
        type: 'info',
      });
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await rateProject(project.id, star, currentUser);
      
      const updatedProject: Project = {
        ...project,
        rating: res.rating,
        ratingsCount: res.ratingsCount,
        ratings: {
          ...(project.ratings || {}),
          [currentUser.uid]: star,
        },
      };

      if (onProjectUpdated) {
        onProjectUpdated(updatedProject);
      }

      showToast({
        title: 'Note enregistrée !',
        message: `Vous avez attribué ${star} étoile${star > 1 ? 's' : ''} à ce projet.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Erreur',
        message: err.message || 'Impossible d\'enregistrer la note.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      const res = await deleteProjectRating(project.id, currentUser);
      
      const nextRatings = { ...(project.ratings || {}) };
      delete nextRatings[currentUser.uid];

      const updatedProject: Project = {
        ...project,
        rating: res.rating,
        ratingsCount: res.ratingsCount,
        ratings: nextRatings,
      };

      if (onProjectUpdated) {
        onProjectUpdated(updatedProject);
      }

      showToast({
        title: 'Note supprimée',
        message: 'Votre évaluation a été retirée du projet.',
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Erreur',
        message: err.message || 'Impossible de supprimer la note.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpfulClick = async (commentId: string) => {
    if (!currentUser) {
      showToast({
        title: 'Connexion requise',
        message: 'Connectez-vous pour indiquer si cet avis vous a été utile.',
        type: 'info',
      });
      if (onOpenAuth) onOpenAuth();
      return;
    }

    try {
      const res = await toggleCommentHelpful(commentId, project.id, currentUser);
      const updated = comments.map((c) => {
        if (c.id === commentId) {
          const currentHelpful = Array.from(new Set(c.helpfulUsers || []));
          const idx = currentHelpful.indexOf(currentUser.uid);
          if (idx === -1) currentHelpful.push(currentUser.uid);
          else currentHelpful.splice(idx, 1);
          return { ...c, helpfulUsers: currentHelpful, helpfulCount: res.helpfulCount };
        }
        return c;
      });

      if (onCommentsUpdated) {
        onCommentsUpdated(updated);
      }

      showToast({
        title: res.isHelpful ? 'Merci pour votre retour !' : 'Vote retiré',
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Erreur',
        message: err.message || 'Action impossible.',
        type: 'error',
      });
    }
  };

  const handleSendDeveloperReply = async (commentId: string) => {
    if (!currentUser || !replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const updatedComment = await replyToProjectComment(
        commentId,
        project.id,
        replyText.trim(),
        currentUser
      );

      const updated = comments.map((c) => (c.id === commentId ? updatedComment : c));
      if (onCommentsUpdated) {
        onCommentsUpdated(updated);
      }

      setReplyText('');
      setReplyingCommentId(null);
      showToast({
        title: 'Réponse publiée !',
        message: 'Votre réponse de développeur a été ajoutée sous l\'avis.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Erreur',
        message: err.message || 'Impossible de publier la réponse.',
        type: 'error',
      });
    } finally {
      setSubmittingReply(false);
    }
  };

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

  return (
    <div className="space-y-8">
      
      {/* 1. GOOGLE PLAY STORE HEADER & DISTRIBUTION SUMMARY */}
      <div className="p-5 sm:p-7 rounded-3xl bg-zinc-950/90 border border-zinc-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white font-mono flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>Notes et avis</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Les notes et les avis sont vérifiés et proviennent de la communauté de développeurs ORAX.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Système Play Store</span>
          </div>
        </div>

        {/* Big Number & Distribution Bars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left: Big Score & Stars */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/70">
            <div className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight">
              {distribution.total > 0 ? distribution.average.toFixed(1) : '0.0'}
            </div>

            <div className="mt-2">
              <StarRatingDisplay
                rating={distribution.average}
                size="lg"
              />
            </div>

            <div className="text-xs sm:text-sm text-zinc-400 font-mono mt-2">
              {distribution.total > 0 ? (
                <>
                  <span className="text-white font-bold">{distribution.total.toLocaleString('fr-FR')}</span> note{distribution.total > 1 ? 's' : ''} au total
                </>
              ) : (
                'Aucune note pour le moment'
              )}
            </div>

            {distribution.total === 0 && (
              <p className="text-[11px] text-amber-400/90 mt-1 font-mono">
                Soyez le premier à noter !
              </p>
            )}
          </div>

          {/* Right: 5 Stars Distribution Progress Bars (Google Play Store Style) */}
          <div className="md:col-span-7 space-y-2.5">
            {[5, 4, 3, 2, 1].map((starNum) => {
              const count = distribution.counts[starNum as 1 | 2 | 3 | 4 | 5] || 0;
              const percentage = distribution.percentages[starNum as 1 | 2 | 3 | 4 | 5] || 0;
              const isSelected = starFilter === starNum;

              return (
                <button
                  key={starNum}
                  type="button"
                  onClick={() => setStarFilter(isSelected ? 'all' : starNum)}
                  className={`w-full flex items-center gap-3 group text-left px-2 py-1 rounded-xl transition-all ${
                    isSelected ? 'bg-amber-500/10 ring-1 ring-amber-400/40' : 'hover:bg-zinc-900/60'
                  }`}
                  title={`Filtrer par ${starNum} étoile${starNum > 1 ? 's' : ''} (${count} avis)`}
                >
                  {/* Star digit */}
                  <div className="flex items-center gap-1 w-8 justify-end text-xs font-mono font-bold text-zinc-300">
                    <span>{starNum}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </div>

                  {/* Play Store Progress Bar */}
                  <div className="flex-1 h-3 rounded-full bg-zinc-800/90 overflow-hidden relative shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        percentage > 0 
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-sm shadow-amber-500/30' 
                          : 'bg-transparent'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Percentage & count */}
                  <div className="w-12 text-right text-[11px] font-mono text-zinc-400 group-hover:text-zinc-200">
                    {percentage}%
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* 2. INTERACTIVE PLAY STORE "ÉVALUER CETTE APPLICATION" WIDGET */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-lg">
        {userScore ? (
          // USER HAS ALREADY RATED
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={currentUser?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser?.displayName || 'Dev')}`}
                alt={currentUser?.displayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-amber-400/60"
              />
              <div>
                <div className="text-xs text-zinc-400 font-mono">Votre évaluation actuelle</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRatingDisplay rating={userScore} size="md" />
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {userScore} / 5 ({STAR_LABELS[userScore]})
                  </span>
                </div>
              </div>
            </div>

            {/* Actions for current rating */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1.5 rounded-xl border border-zinc-800">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleRateClick(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 hover:scale-125 transition-transform"
                    title={`Changer ma note pour ${s} étoiles`}
                  >
                    <Star
                      className={`w-4 h-4 transition-colors ${
                        (hoverRating !== null ? hoverRating >= s : userScore >= s)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                id="btn-delete-user-rating"
                disabled={isSubmitting}
                onClick={handleDeleteRating}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 border border-zinc-700 text-zinc-400 transition-all flex items-center gap-1.5"
                title="Supprimer votre note"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Supprimer</span>
              </button>
            </div>
          </div>
        ) : (
          // USER HAS NOT RATED YET
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="space-y-1 max-w-md">
              <h4 className="text-base font-bold text-white font-mono flex items-center justify-center sm:justify-start gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Évaluez ce projet</span>
              </h4>
              <p className="text-xs text-zinc-400">
                Donnez votre avis sur le code, les fonctionnalités et la documentation pour guider les autres créateurs.
              </p>
            </div>

            {/* Big Interactive 5 Stars */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 bg-zinc-950 p-2.5 rounded-2xl border border-zinc-800 shadow-inner">
                {[1, 2, 3, 4, 5].map((starNum) => {
                  const isFilled = (hoverRating !== null ? hoverRating >= starNum : false);
                  return (
                    <button
                      key={starNum}
                      type="button"
                      disabled={isSubmitting}
                      onMouseEnter={() => setHoverRating(starNum)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => handleRateClick(starNum)}
                      className="p-1.5 text-zinc-700 hover:scale-125 transition-transform cursor-pointer group"
                      title={`${starNum} étoile${starNum > 1 ? 's' : ''} : ${STAR_LABELS[starNum]}`}
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                            : 'text-zinc-700 group-hover:text-amber-400/80'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Dynamic descriptor text */}
              <div className="h-4 text-xs font-mono font-semibold text-amber-400">
                {hoverRating ? STAR_LABELS[hoverRating] : 'Touchez pour noter (1 à 5 étoiles)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. REVIEWS & COMMENTS FILTER BAR (Play Store Style) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white font-mono">
              Avis des utilisateurs ({filteredComments.length})
            </h4>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 font-mono">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="recent">Les plus récents</option>
              <option value="helpful">Les plus utiles</option>
              <option value="highest">Meilleures notes (5★)</option>
              <option value="lowest">Moins bonnes notes (1★)</option>
            </select>
          </div>
        </div>

        {/* Filter chips (All, 5★, 4★, 3★, 2★, 1★) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStarFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all ${
              starFilter === 'all'
                ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Tous ({comments.length})
          </button>

          {[5, 4, 3, 2, 1].map((s) => {
            const count = comments.filter((c) => c.rating === s).length;
            const isSelected = starFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStarFilter(isSelected ? 'all' : s)}
                className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all ${
                  isSelected
                    ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <span>{s}</span>
                <Star className={`w-3 h-3 ${isSelected ? 'fill-zinc-950' : 'fill-amber-400 text-amber-400'}`} />
                <span>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. REVIEWS LIST */}
      <div className="space-y-4">
        {filteredComments.length > 0 ? (
          filteredComments.map((c) => {
            const isFounder = c.userIsLordDemon || c.userDisplayName.toUpperCase().includes('LORD DEMON');
            const isAuthor = currentUser && (currentUser.uid === c.userId || currentUser.isAdmin);
            const isHelpfulByMe = currentUser && c.helpfulUsers && c.helpfulUsers.includes(currentUser.uid);
            const isReplying = replyingCommentId === c.id;

            return (
              <div
                key={c.id}
                className="p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800/90 space-y-4 transition-all hover:border-zinc-700"
              >
                {/* Header: User avatar, name, stars & date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={c.userPhotoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(c.userDisplayName)}`}
                      alt={c.userDisplayName}
                      className="w-9 h-9 rounded-full object-cover bg-zinc-900 border border-zinc-700"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-zinc-200 font-mono">
                          {c.userDisplayName}
                        </span>
                        {isFounder && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            Fondateur
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        {c.rating && (
                          <StarRatingDisplay rating={c.rating} size="xs" />
                        )}
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {formatDate(c.createdAt)}
                          {c.updatedAt && ' (modifié)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Options / Delete for author or admin */}
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => deleteProjectComment(c.id, project.id, currentUser!.uid, currentUser?.isAdmin)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10"
                      title="Supprimer votre commentaire"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Comment Body */}
                <p className="text-sm text-zinc-300 leading-relaxed font-sans pl-12 whitespace-pre-line">
                  {c.content}
                </p>

                {/* Helpful Thumbs up bar (Google Play Store Style) */}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-900 pl-12 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-[11px]">Cet avis vous a-t-il été utile ?</span>
                    <button
                      type="button"
                      onClick={() => handleHelpfulClick(c.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono text-[11px] font-semibold border transition-all ${
                        isHelpfulByMe
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                      }`}
                    >
                      <ThumbsUp className={`w-3 h-3 ${isHelpfulByMe ? 'fill-cyan-400 text-cyan-400' : ''}`} />
                      <span>Oui ({c.helpfulCount || 0})</span>
                    </button>
                  </div>

                  {/* Project developer can reply */}
                  {isOwnerOrAdmin && !c.developerReply && !isReplying && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingCommentId(c.id);
                        setReplyText('');
                      }}
                      className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Répondre</span>
                    </button>
                  )}
                </div>

                {/* Developer reply box (Google Play Store format) */}
                {c.developerReply && (
                  <div className="ml-12 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-mono font-bold text-cyan-300">
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>Réponse de {c.developerReply.developerName} (Auteur)</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {formatDate(c.developerReply.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
                      {c.developerReply.content}
                    </p>
                  </div>
                )}

                {/* In-line Reply input form */}
                {isReplying && (
                  <div className="ml-12 p-3.5 rounded-2xl bg-zinc-900 border border-cyan-500/40 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs text-cyan-300 font-mono font-semibold">
                      <span>Répondre à cet avis en tant que développeur</span>
                      <button
                        onClick={() => setReplyingCommentId(null)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Remerciez l'utilisateur, clarifiez un point ou annoncez un correctif..."
                      className="w-full bg-zinc-950 p-2.5 rounded-xl text-xs text-white border border-zinc-800 focus:outline-none focus:border-cyan-500"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyingCommentId(null)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={submittingReply || !replyText.trim()}
                        onClick={() => handleSendDeveloperReply(c.id)}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-md flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publier la réponse</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })
        ) : (
          <div className="p-8 rounded-3xl bg-zinc-950/40 border border-zinc-800/60 text-center space-y-2">
            <Star className="w-8 h-8 text-zinc-700 mx-auto" />
            <h5 className="text-sm font-bold text-zinc-300">
              {starFilter === 'all'
                ? 'Aucun avis rédigé pour le moment'
                : `Aucun avis avec ${starFilter} étoile${starFilter > 1 ? 's' : ''}`}
            </h5>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Utilisez le sélecteur ci-dessus pour attribuer votre note ou rédiger le premier commentaire.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
