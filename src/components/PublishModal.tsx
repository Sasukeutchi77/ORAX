import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileArchive, 
  Image as ImageIcon, 
  Layers, 
  Tag, 
  Code2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  HardDrive
} from 'lucide-react';
import { Project, ProjectCategory, UserProfile } from '../types';
import { CATEGORIES } from '../data/categories';
import { uploadToCloudinary, formatFileSize, validateProjectFile, validateThumbnailFile } from '../services/cloudinary';
import { saveNewProject } from '../services/firebase';
import { saveFileToIndexedDB } from '../utils/fileStorage';
import { useToast } from './Toast';
import { motion } from 'motion/react';

interface PublishModalProps {
  onClose: () => void;
  currentUser: UserProfile | null;
  onProjectPublished: (newProject: Project) => void;
  onOpenAuth: () => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  onClose,
  currentUser,
  onProjectPublished,
  onOpenAuth,
}) => {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [developerName, setDeveloperName] = useState(currentUser?.displayName || '');
  const [category, setCategory] = useState<ProjectCategory>('web');
  const [techInput, setTechInput] = useState('');
  const [technologies, setTechnologies] = useState<string[]>(['React', 'TypeScript', 'Node.js']);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['opensource', 'web', 'modern']);
  const [version, setVersion] = useState('1.0.0');

  // Thumbnail
  const [thumbnailUrl, setThumbnailUrl] = useState('https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  // Project Archive File
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Preview tab switcher
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  // Technology tag management
  const handleAddTech = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (e.preventDefault) e.preventDefault();
    const clean = techInput.trim();
    if (clean && !technologies.includes(clean)) {
      setTechnologies([...technologies, clean]);
      setTechInput('');
    }
  };

  const handleRemoveTech = (tech: string) => {
    setTechnologies(technologies.filter(t => t !== tech));
  };

  // Tag management
  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (e.preventDefault) e.preventDefault();
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Handle Thumbnail selection
  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateThumbnailFile(file);
      if (!validation.valid) {
        showToast({
          title: 'Image non valide',
          message: validation.error || 'Veuillez choisir une image valide.',
          type: 'warning',
        });
        return;
      }

      setThumbnailFile(file);
      setThumbnailUploading(true);
      try {
        const result = await uploadToCloudinary(file, undefined, 'image', 'orax_thumbnails');
        setThumbnailUrl(result.url);
        showToast({
          title: 'Image miniature prête',
          message: 'L\'image du projet a été importée avec succès.',
          type: 'success',
        });
      } catch (err: any) {
        showToast({
          title: 'Avertissement Image',
          message: 'Prévisualisation locale utilisée pour la miniature.',
          type: 'info',
        });
        setThumbnailUrl(URL.createObjectURL(file));
      } finally {
        setThumbnailUploading(false);
      }
    }
  };

  // Handle Project File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateProjectFile(file);
      if (!validation.valid) {
        setErrorMsg(validation.error || 'Format ou taille de fichier non valide.');
        return;
      }
      setErrorMsg('');
      setProjectFile(file);
    }
  };

  // Submit Publication
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentUser) {
      showToast({
        title: 'Connexion requise',
        message: 'Vous devez être connecté pour publier un projet.',
        type: 'warning',
      });
      onOpenAuth();
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Veuillez renseigner le nom de votre projet.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Veuillez ajouter une description détaillée pour votre projet.');
      return;
    }

    if (!projectFile) {
      setErrorMsg('Veuillez joindre l\'archive du projet (.zip, .tar, .rar ou source).');
      return;
    }

    const fileValidation = validateProjectFile(projectFile);
    if (!fileValidation.valid) {
      setErrorMsg(fileValidation.error || 'Fichier de projet invalide.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Upload project file to Cloudinary
      const uploadResult = await uploadToCloudinary(projectFile, (percent) => {
        setUploadProgress(percent);
      });

      // 2. Save project metadata to Firestore
      const newProject = await saveNewProject({
        name: name.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim() || description.substring(0, 140) + '...',
        developerName: developerName.trim() || currentUser.displayName || 'Dev Anonyme',
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        category,
        technologies: technologies.length > 0 ? technologies : ['Code'],
        tags: tags.length > 0 ? tags : ['projet'],
        fileUrl: uploadResult.url,
        fileName: projectFile.name,
        fileSize: uploadResult.bytes || projectFile.size,
        fileFormat: uploadResult.format?.toUpperCase() || 'ZIP',
        cloudinaryPublicId: uploadResult.publicId,
        thumbnail: thumbnailUrl,
        version: version.trim() || '1.0.0',
        featured: false,
      });

      // 3. Store binary file in IndexedDB asynchronously without blocking the user
      saveFileToIndexedDB(newProject.id, projectFile, projectFile.name).catch((idbErr) => {
        console.warn('IndexedDB save warning:', idbErr);
      });
      if (uploadResult.url) {
        saveFileToIndexedDB(uploadResult.url, projectFile, projectFile.name).catch(() => {});
      }

      setIsUploading(false);
      showToast({
        title: 'Votre projet a été publié avec succès !',
        message: 'Il est maintenant visible et téléchargeable sur ORAX PROJET.',
        type: 'success',
      });

      onProjectPublished(newProject);
      onClose();
    } catch (err: any) {
      setIsUploading(false);
      setErrorMsg(err.message || 'Échec de la publication du projet. Veuillez vérifier les fichiers et réessayer.');
      showToast({
        title: 'Erreur de publication',
        message: err.message || 'Impossible d\'envoyer le projet.',
        type: 'error',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] sm:max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800 bg-zinc-950/90 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono truncate">Publier un Projet</h2>
                <p className="text-[11px] sm:text-xs text-zinc-400 truncate">Partagez votre création avec la communauté</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Tab switcher: Form / Preview on desktop */}
              <div className="hidden sm:flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    activeTab === 'form' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Formulaire
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    activeTab === 'preview' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Aperçu
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex sm:hidden mt-3 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-center transition-colors ${
                activeTab === 'form' ? 'bg-cyan-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Formulaire
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-center transition-colors ${
                activeTab === 'preview' ? 'bg-cyan-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Aperçu en direct
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8 flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {activeTab === 'form' ? (
            <form onSubmit={handlePublish} className="space-y-6">
              
              {/* General Project Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono text-cyan-400">
                  1. Informations Générales
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Nom du projet *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: ORAX BOT, Modern Portfolio, Flutter Wallet..."
                      className="w-full bg-zinc-950 text-sm text-white placeholder-zinc-500 px-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Version
                    </label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="1.0.0"
                      className="w-full bg-zinc-950 text-sm font-mono text-white placeholder-zinc-500 px-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Nom du développeur / Auteur *
                    </label>
                    <input
                      type="text"
                      required
                      value={developerName}
                      onChange={(e) => setDeveloperName(e.target.value)}
                      placeholder="Ex: LORD DEMON ou votre pseudo"
                      className="w-full bg-zinc-950 text-sm text-white placeholder-zinc-500 px-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Catégorie principale *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                      className="w-full bg-zinc-950 text-sm text-white px-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60 cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Description courte (carte)
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Bref résumé accrocheur en une ou deux phrases..."
                    className="w-full bg-zinc-950 text-sm text-white placeholder-zinc-500 px-4 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Description complète & Instructions * (Supporte le Markdown)
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Détaillez les fonctionnalités clés, prérequis, méthode d'installation (npm, docker, python), commandes de build, etc."
                    className="w-full bg-zinc-950 text-sm text-white placeholder-zinc-500 p-4 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60 font-sans"
                  />
                </div>
              </div>

              {/* Technologies & Tags */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono text-cyan-400">
                  2. Stack Technique & Mots-Clés
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Technologies utilisées (Appuyez sur Entrée pour ajouter)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyDown={handleAddTech}
                      placeholder="Ex: React, Flutter, Node.js, Telegram API..."
                      className="flex-1 bg-zinc-950 text-sm text-white placeholder-zinc-500 px-4 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
                    />
                    <button
                      type="button"
                      onClick={handleAddTech}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white rounded-xl"
                    >
                      Ajouter
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {technologies.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800 text-cyan-300 border border-zinc-700">
                        {t}
                        <button type="button" onClick={() => handleRemoveTech(t)} className="text-zinc-400 hover:text-rose-400">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Tags & Mots-clés pour la recherche
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Ex: bot, automation, script, mobile..."
                      className="flex-1 bg-zinc-950 text-sm text-white placeholder-zinc-500 px-4 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white rounded-xl"
                    >
                      Ajouter
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tg) => (
                      <span key={tg} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                        #{tg}
                        <button type="button" onClick={() => handleRemoveTag(tg)} className="text-zinc-400 hover:text-rose-400">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Media & Files Upload */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono text-cyan-400">
                  3. Fichiers & Stockage Haute Vitesse
                </h3>

                {/* Thumbnail upload */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Image miniature du projet (Logo ou Capture d'écran)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 relative shrink-0">
                      <img
                        src={thumbnailUrl}
                        alt="Miniature"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-cyan-400 hover:file:bg-zinc-700 cursor-pointer"
                      />
                      <input
                        type="url"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        placeholder="Ou collez une URL d'image directe (ex: https://...)"
                        className="w-full bg-zinc-950 text-xs text-zinc-300 px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Archive file upload */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Archive du projet * (.ZIP, .RAR, .TAR.GZ, .APK, code source)
                  </label>
                  <div className="p-5 rounded-2xl bg-zinc-950 border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 transition-colors text-center relative">
                    <FileArchive className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-white">
                      {projectFile ? projectFile.name : 'Sélectionnez ou glissez l\'archive de votre projet'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {projectFile ? `Taille : ${formatFileSize(projectFile.size)}` : 'Formats recommandés : .zip, .tar.gz (Max 150 Mo)'}
                    </p>

                    <input
                      type="file"
                      required={!projectFile}
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>

                {/* Upload Progress Bar */}
                {isUploading && (
                  <div className="space-y-2 p-4 rounded-xl bg-zinc-950 border border-cyan-500/30 animate-pulse">
                    <div className="flex justify-between text-xs font-mono text-cyan-400">
                      <span>Téléversement sécurisé en cours...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-zinc-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors text-center cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  id="btn-publish-project-submit"
                  type="submit"
                  disabled={isUploading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {isUploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      <span>Publication en cours ({uploadProgress}%)...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 stroke-[2.5]" />
                      <span>PUBLIER LE PROJET</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : (
            /* Live Preview tab */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">Aperçu direct de la carte</p>
                <p className="text-xs text-zinc-400">Voici comment les autres utilisateurs verront votre projet dans la liste :</p>
              </div>

              <div className="max-w-sm mx-auto bg-zinc-900 border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl">
                <div className="relative h-44 w-full overflow-hidden bg-zinc-950">
                  <img
                    src={thumbnailUrl}
                    alt={name || 'Aperçu'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
                    {CATEGORIES.find(c => c.id === category)?.name || 'Web'}
                  </div>
                  {projectFile && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[11px] font-mono bg-zinc-900/80 text-zinc-300 border border-zinc-700">
                      {formatFileSize(projectFile.size)}
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-base text-white truncate">
                    {name || 'Nom de votre projet'}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {shortDescription || description || 'Aucune description fournie.'}
                  </p>
                  <div className="text-xs text-zinc-500">
                    Développeur : <span className="text-cyan-400 font-semibold">{developerName || 'Anonyme'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {technologies.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white"
                >
                  Retourner au formulaire de publication
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
