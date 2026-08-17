import React, { useState, useRef } from 'react';
import { 
  User, 
  Mail, 
  Calendar, 
  FolderGit2, 
  Download, 
  Eye, 
  Upload, 
  Edit, 
  Trash2, 
  Sparkles, 
  ExternalLink,
  Shield,
  Layers,
  Camera,
  Loader2,
  Check,
  X,
  FileText,
  Star,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { Project, UserProfile as UserProfileType } from '../types';
import { ProjectCard } from './ProjectCard';
import { formatFileSize, uploadAvatarToCloudinary } from '../services/cloudinary';
import { updateUserProfile } from '../services/firebase';
import { useToast } from './Toast';

interface UserProfileProps {
  user: UserProfileType;
  userProjects: Project[];
  onSelectProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onOpenPublish: () => void;
  onSelectDeveloper?: (developerName: string) => void;
  onUpdateUser?: (updatedUser: UserProfileType) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  userProjects,
  onSelectProject,
  onEditProject,
  onDeleteProject,
  onOpenPublish,
  onSelectDeveloper,
  onUpdateUser,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.displayName);
  const [editBio, setEditBio] = useState(user.bio || '');
  const [editPhotoURL, setEditPhotoURL] = useState(user.photoURL || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const isLordDemon = user.displayName.toUpperCase().includes('LORD DEMON') || user.uid === 'dev_lord_demon';
  
  const totalDownloads = userProjects.reduce((sum, p) => sum + (p.downloads || 0), 0);
  const totalViews = userProjects.reduce((sum, p) => sum + (p.views || 0), 0);

  // Compute average rating for user projects
  const ratedProjects = userProjects.filter(p => p.rating && p.rating > 0);
  const averageRating = ratedProjects.length > 0
    ? (ratedProjects.reduce((acc, p) => acc + (p.rating || 0), 0) / ratedProjects.length).toFixed(1)
    : (isLordDemon ? '4.9' : '5.0');

  const followingList = user.following || [];

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '2026';
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        title: 'Format non valide',
        message: 'Veuillez sélectionner un fichier image (PNG, JPG, WEBP).',
        type: 'error',
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const url = await uploadAvatarToCloudinary(file);
      setEditPhotoURL(url);
      
      // If not in full edit mode, save directly
      if (!isEditing) {
        const updated = await updateUserProfile(user.uid, { photoURL: url });
        if (onUpdateUser) onUpdateUser(updated);
        showToast({
          title: 'Photo de profil mise à jour',
          message: 'Votre photo a été enregistrée et synchronisée avec succès.',
          type: 'success',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Erreur de téléversement',
        message: err.message || 'Impossible d\'envoyer la photo.',
        type: 'error',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast({
        title: 'Nom requis',
        message: 'Le nom d\'utilisateur ne peut pas être vide.',
        type: 'error',
      });
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateUserProfile(user.uid, {
        displayName: editName.trim(),
        bio: editBio.trim(),
        photoURL: editPhotoURL || user.photoURL,
      });

      if (onUpdateUser) onUpdateUser(updated);
      setIsEditing(false);
      showToast({
        title: 'Profil mis à jour',
        message: 'Vos informations ont été enregistrées avec succès.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Erreur de mise à jour',
        message: err.message || 'Impossible d\'enregistrer les modifications.',
        type: 'error',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Profile Header Card */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            
            {/* Avatar with Cloudinary quick upload */}
            <div className="relative group">
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.displayName)}`}
                alt={user.displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-950 object-cover border-2 border-cyan-500/40 shadow-xl"
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                title="Changer la photo de profil"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-cyan-400" />
                    <span className="text-[9px] font-bold mt-1 font-mono">Changer</span>
                  </>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />

              {isLordDemon && (
                <div className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-cyan-500 text-zinc-950 shadow-lg" title="Fondateur ORAX">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  {user.displayName}
                </h1>
                {isLordDemon && (
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Fondateur & Dev
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Membre depuis {formatDate(user.createdAt)}
                </span>
              </div>

              {user.bio ? (
                <p className="text-xs text-zinc-300 max-w-lg mt-2 leading-relaxed">
                  {user.bio}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 italic mt-1">
                  Aucune biographie rédigée. Cliquez sur Modifier pour en ajouter une.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => {
                setEditName(user.displayName);
                setEditBio(user.bio || '');
                setEditPhotoURL(user.photoURL || '');
                setIsEditing(!isEditing);
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
            >
              <Edit className="w-4 h-4 text-cyan-400" />
              <span>{isEditing ? 'Annuler' : 'Modifier le profil'}</span>
            </button>

            <button
              onClick={onOpenPublish}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 shrink-0"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>Publier un nouveau projet</span>
            </button>
          </div>
        </div>

        {/* Profile Edit Inline Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Edit className="w-4 h-4 text-cyan-400" />
              Modifier mes informations de profil
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nom d'affichage / Pseudo *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-950 text-sm text-white px-3.5 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Photo de profil (Lien direct ou image)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editPhotoURL}
                    onChange={(e) => setEditPhotoURL(e.target.value)}
                    placeholder="https://... ou importer"
                    className="w-full bg-zinc-950 text-xs text-white px-3.5 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs text-cyan-400 font-bold rounded-xl border border-zinc-700 shrink-0"
                  >
                    {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Parcourir'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Bio / Spécialités
              </label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Ex: Développeur Full-Stack, créateur d'outils open-source et bots d'automatisation."
                rows={2}
                className="w-full bg-zinc-950 text-sm text-white p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Enregistrer les modifications</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* User Stats Ribbon */}
        <div className="mt-8 pt-6 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
            <div className="text-2xl font-extrabold text-white font-mono">{userProjects.length}</div>
            <p className="text-xs text-zinc-400 mt-0.5">Projets Publiés</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {totalDownloads.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Téléchargements</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
            <div className="text-2xl font-extrabold text-amber-400 font-mono flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{averageRating}</span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Note Moyenne</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">
              {followingList.length}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Développeurs Suivis</p>
          </div>
        </div>

        {/* Followed Developers Bar if any */}
        {followingList.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                Développeurs que vous suivez ({followingList.length})
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {followingList.map((devName, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectDeveloper && onSelectDeveloper(devName)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/50 text-xs text-zinc-200 flex items-center gap-1.5 transition-all group font-mono"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="group-hover:text-cyan-300 font-semibold">{devName}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Projects Management Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-mono flex items-center gap-2">
              <FolderGit2 className="w-6 h-6 text-cyan-400" />
              Mes Projets ({userProjects.length})
            </h2>
            <p className="text-xs text-zinc-400">Gérez, modifiez ou supprimez vos projets mis en ligne</p>
          </div>
        </div>

        {userProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userProjects.map((project, idx) => (
              <div key={project.id} className="relative group">
                <ProjectCard
                  project={project}
                  onSelect={onSelectProject}
                  onSelectDeveloper={onSelectDeveloper}
                  index={idx}
                />

                {/* Management Overlay Toolbar */}
                <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                  <span className="text-zinc-400 font-mono">Actions :</span>
                  <div className="flex items-center gap-2">
                    <button
                      id={`edit-my-project-${project.id}`}
                      onClick={() => onEditProject(project)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-cyan-950 text-cyan-400 hover:border-cyan-500/40 border border-transparent transition-colors flex items-center gap-1 font-semibold"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                    <button
                      id={`delete-my-project-${project.id}`}
                      onClick={() => onDeleteProject(project)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950 text-rose-400 hover:border-rose-500/40 border border-transparent transition-colors flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto">
              <FolderGit2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Vous n'avez pas encore publié de projet</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Partagez votre première application, bot, script ou logiciel avec la communauté des développeurs ORAX.
            </p>
            <button
              onClick={onOpenPublish}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Publier mon premier projet</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
