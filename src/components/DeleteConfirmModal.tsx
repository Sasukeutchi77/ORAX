import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Project, UserProfile } from '../types';
import { deleteExistingProject } from '../services/firebase';
import { useToast } from './Toast';
import { motion } from 'motion/react';

interface DeleteConfirmModalProps {
  project: Project | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onDeleted: (projectId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  project,
  currentUser,
  onClose,
  onDeleted,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!project) return null;

  const handleDelete = async () => {
    setLoading(true);

    try {
      const uid = currentUser?.uid || 'dev_lord_demon';
      await deleteExistingProject(project.id, uid);
      showToast({
        title: 'Projet supprimé',
        message: `Le projet "${project.name}" a été définitivement supprimé.`,
        type: 'info',
      });
      onDeleted(project.id);
      onClose();
    } catch (err: any) {
      showToast({
        title: 'Erreur de suppression',
        message: err.message || 'Impossible de supprimer ce projet.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-white font-mono mb-2">
          Supprimer ce projet ?
        </h3>

        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
          Êtes-vous sûr de vouloir supprimer définitivement <strong className="text-white">"{project.name}"</strong> ? Cette action est irréversible et retirera le projet ainsi que ses fichiers de la plateforme.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{loading ? 'Suppression...' : 'Oui, supprimer le projet'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
