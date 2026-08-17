import React, { useState, useRef } from 'react';
import { 
  X, 
  Save, 
  AlertCircle, 
  Image as ImageIcon, 
  Tag, 
  Code2, 
  Upload, 
  FileCode, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { Project, ProjectCategory } from '../types';
import { CATEGORIES } from '../data/categories';
import { updateExistingProject } from '../services/firebase';
import { uploadToCloudinary, formatFileSize, validateProjectFile, validateThumbnailFile } from '../services/cloudinary';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'motion/react';

interface EditProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onUpdated: (updatedProject: Project) => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  onClose,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  if (!project) return null;

  // Active sub-tab in edit modal: 'info' (Modifier infos) or 'version' (Nouvelle version / Update file)
  const [activeTab, setActiveTab] = useState<'info' | 'version'>('info');

  // Basic Info Form State
  const [name, setName] = useState(project.name);
  const [shortDescription, setShortDescription] = useState(project.shortDescription || '');
  const [description, setDescription] = useState(project.description);
  const [category, setCategory] = useState<ProjectCategory>(project.category);
  const [developerName, setDeveloperName] = useState(project.developerName);
  const [technologies, setTechnologies] = useState<string[]>(project.technologies);
  const [techInput, setTechInput] = useState('');
  const [tags, setTags] = useState<string[]>(project.tags);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState(project.thumbnail);
  const [demoUrl, setDemoUrl] = useState(project.demoUrl || '');
  const [githubUrl, setGithubUrl] = useState(project.githubUrl || '');

  // New Version Workflow State (Mon projet -> Modifier -> Nouvelle version -> Upload -> Publier)
  const [newVersionNumber, setNewVersionNumber] = useState(() => {
    const current = project.version || '1.0.0';
    const parts = current.split('.');
    if (parts.length === 3 && !isNaN(Number(parts[2]))) {
      return `${parts[0]}.${parts[1]}.${Number(parts[2]) + 1}`;
    }
    return '1.1.0';
  });
  const [versionNotes, setVersionNotes] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploadingNewFile, setUploadingNewFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // General Submit State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddTech = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (e.preventDefault) e.preventDefault();
    const clean = techInput.trim();
    if (clean && !technologies.includes(clean)) {
      setTechnologies([...technologies, clean]);
      setTechInput('');
    }
  };

  const handleRemoveTech = (t: string) => {
    setTechnologies(technologies.filter(item => item !== t));
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (e.preventDefault) e.preventDefault();
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(item => item !== t));
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      try {
        const res = await uploadToCloudinary(file, undefined, 'image', 'orax_thumbnails');
        setThumbnailUrl(res.url);
        showToast({
          title: 'Miniature mise à jour',
          type: 'success',
        });
      } catch {
        setThumbnailUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validation = validateProjectFile(selected);
      if (!validation.valid) {
        setError(validation.error || 'Format ou taille de fichier non valide.');
        return;
      }
      setError('');
      setNewFile(selected);
    }
  };

  const handlePublishNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newFile && !project.fileUrl) {
      setError('Veuillez sélectionner le nouveau fichier du projet (archive, zip, code, binaire).');
      return;
    }

    if (newFile) {
      const validation = validateProjectFile(newFile);
      if (!validation.valid) {
        setError(validation.error || 'Fichier non valide.');
        return;
      }
    }

    setSaving(true);
    setUploadingNewFile(true);

    try {
      let fileUrl = project.fileUrl;
      let fileName = project.fileName;
      let fileSize = project.fileSize;
      let fileFormat = project.fileFormat;
      let cloudinaryPublicId = project.cloudinaryPublicId;

      // Upload new file version if selected
      if (newFile) {
        setUploadProgress(25);
        const res = await uploadToCloudinary(newFile, (progress) => {
          setUploadProgress(Math.round(progress));
        });
        fileUrl = res.url;
        fileName = newFile.name;
        fileSize = newFile.size;
        fileFormat = newFile.name.split('.').pop() || 'zip';
        cloudinaryPublicId = res.publicId;
      }

      // Append version notes to description if provided
      let updatedDesc = description;
      if (versionNotes.trim()) {
        updatedDesc = `${description.trim()}\n\n### 🚀 Nouveautés (v${newVersionNumber})\n${versionNotes.trim()}`;
      }

      const updated = await updateExistingProject(project.id, {
        name: name.trim(),
        shortDescription: shortDescription.trim(),
        description: updatedDesc,
        version: newVersionNumber.trim(),
        fileUrl,
        fileName,
        fileSize,
        fileFormat,
        cloudinaryPublicId,
        thumbnail: thumbnailUrl,
        technologies,
        tags,
      });

      showToast({
        title: 'Nouvelle version publiée !',
        message: `La version v${newVersionNumber} de "${name}" est désormais en ligne sans avoir à recréer le projet.`,
        type: 'success',
      });

      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Impossible de publier la nouvelle version.');
    } finally {
      setSaving(false);
      setUploadingNewFile(false);
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !description.trim()) {
      setError('Veuillez remplir le nom et la description.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateExistingProject(project.id, {
        name: name.trim(),
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        category,
        developerName: developerName.trim(),
        technologies,
        tags,
        thumbnail: thumbnailUrl,
        demoUrl: demoUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
      });

      showToast({
        title: 'Projet mis à jour avec succès',
        type: 'success',
      });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Impossible de mettre à jour le projet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[92vh] flex flex-col"
      >
        {/* Header with Title and Mode Switcher */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <span>Gestion du Projet : {project.name}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Version actuelle : <span className="font-mono text-cyan-400">v{project.version || '1.0.0'}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Tabs: Modifier Info vs. Nouvelle Version */}
        <div className="flex items-center gap-2 p-1 bg-zinc-950 rounded-2xl border border-zinc-800/80 mb-5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'info'
                ? 'bg-zinc-800 text-cyan-400 shadow-md border border-cyan-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>1. Modifier les détails</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('version')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'version'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 shadow-md border border-cyan-500/50'
                : 'text-zinc-400 hover:text-cyan-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>2. Nouvelle version (Upload & Publier)</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: MODIFIER LES DÉTAILS */}
        {activeTab === 'info' && (
          <form onSubmit={handleSaveInfo} className="space-y-5 overflow-y-auto flex-1 pr-1">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Nom du projet *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                  className="w-full bg-zinc-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none cursor-pointer"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nom du Développeur</label>
                <input
                  type="text"
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                  className="w-full bg-zinc-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Description courte (Accroche)</label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full bg-zinc-950 text-sm text-white px-3.5 py-2 rounded-xl border border-zinc-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Description complète</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-950 text-sm text-white p-3.5 rounded-xl border border-zinc-800 focus:outline-none"
              />
            </div>

            {/* Technologies */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Technologies</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={handleAddTech}
                  placeholder="Ajouter une techno (ex: React, Node.js)..."
                  className="flex-1 bg-zinc-950 text-xs text-white px-3 py-1.5 rounded-xl border border-zinc-800"
                />
                <button
                  type="button"
                  onClick={handleAddTech}
                  className="px-3 py-1.5 bg-zinc-800 text-xs text-white rounded-xl hover:bg-zinc-700"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {technologies.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-cyan-300 flex items-center gap-1">
                    {t}
                    <button type="button" onClick={() => handleRemoveTech(t)} className="text-zinc-400 hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Ajouter un tag (ex: bot, api)..."
                  className="flex-1 bg-zinc-950 text-xs text-white px-3 py-1.5 rounded-xl border border-zinc-800"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-zinc-800 text-xs text-white rounded-xl hover:bg-zinc-700"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tg => (
                  <span key={tg} className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-300 flex items-center gap-1">
                    #{tg}
                    <button type="button" onClick={() => handleRemoveTag(tg)} className="text-zinc-400 hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Image de couverture / Miniature</label>
              <div className="flex gap-3 items-center">
                <img src={thumbnailUrl} alt="Thumbnail" className="w-12 h-12 rounded-lg object-cover bg-zinc-950 border border-zinc-800 shrink-0" />
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-zinc-950 text-xs text-white px-3 py-2 rounded-xl border border-zinc-800 font-mono"
                />
                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-cyan-400 hover:bg-zinc-700 shrink-0"
                >
                  Importer
                </button>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-lg shadow-cyan-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: NOUVELLE VERSION (Mon projet -> Modifier -> Nouvelle version -> Upload -> Publier) */}
        {activeTab === 'version' && (
          <form onSubmit={handlePublishNewVersion} className="space-y-5 overflow-y-auto flex-1 pr-1">
            
            {/* Visual Workflow Steps Banner */}
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 font-mono">
                <Sparkles className="w-4 h-4" />
                <span>Workflow de Mise à Jour Directe</span>
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono text-zinc-300">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">Mon projet</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">Modifier</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">Nouvelle version</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">Upload</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">Publier</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Plus besoin de supprimer et reposter votre projet ! Vous conservez vos statistiques, vos avis, vos étoiles et vos favoris tout en publiant votre nouvelle archive.
              </p>
            </div>

            {/* Version Number Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Numéro de la nouvelle version *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newVersionNumber}
                    onChange={(e) => setNewVersionNumber(e.target.value)}
                    placeholder="ex: 1.1.0, 2.0.0"
                    className="w-full bg-zinc-950 font-mono text-sm text-cyan-300 px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                    Actuel: v{project.version || '1.0.0'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Fichier actuel associé
                </label>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between font-mono">
                  <span className="truncate max-w-[180px]">{project.fileName || 'Archive v' + (project.version || '1.0.0')}</span>
                  <span className="text-zinc-500">{formatFileSize(project.fileSize)}</span>
                </div>
              </div>
            </div>

            {/* Upload New Version Archive */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nouveau fichier / Code source / Archive (Upload) *
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  newFile 
                    ? 'border-emerald-500/60 bg-emerald-950/20' 
                    : 'border-zinc-700 hover:border-cyan-500/60 bg-zinc-950 hover:bg-zinc-900/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {newFile ? (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-emerald-300 font-mono">{newFile.name}</p>
                    <p className="text-[11px] text-zinc-400">{formatFileSize(newFile.size)} • Prêt pour le déploiement</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-[11px] text-cyan-400 hover:underline font-mono"
                    >
                      Remplacer par un autre fichier
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 text-cyan-400 flex items-center justify-center mx-auto border border-zinc-700">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-zinc-200">
                      Cliquez pour téléverser la nouvelle archive
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Formats supportés : .zip, .rar, .tar.gz, .js, .py, .apk, .exe, .sh
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Changelog / Notes de version */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Notes de version / Changelog (Quoi de neuf ?)
              </label>
              <textarea
                rows={3}
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="Ex: Correction des bugs, ajout de nouvelles fonctionnalités, optimisation des performances..."
                className="w-full bg-zinc-950 text-sm text-white p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-mono">
                {uploadingNewFile ? `Envoi en cours : ${uploadProgress}%` : 'Étape finale : Publication immédiate'}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publication en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 stroke-[2.5]" />
                      <span>Publier la version v{newVersionNumber}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

      </motion.div>
    </div>
  );
};
