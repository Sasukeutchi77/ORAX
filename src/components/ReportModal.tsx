import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { Project, UserProfile, ReportReason } from '../types';
import { submitProjectReport } from '../services/firebase';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  currentUser: UserProfile | null;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const REPORT_REASONS: { id: ReportReason; label: string; description: string }[] = [
  {
    id: 'malicious',
    label: 'Contenu malveillant / Virus',
    description: 'Le fichier d\'archive contient un exécutable dangereux, trojan, ou malware.',
  },
  {
    id: 'spam',
    label: 'Spam ou Faux Projet',
    description: 'Publication vide, titre trompeur ou publicité déguisée.',
  },
  {
    id: 'stolen',
    label: 'Projet volé / Droits d\'auteur',
    description: 'Le code source a été publié sans autorisation de son créateur légitime.',
  },
  {
    id: 'inappropriate',
    label: 'Contenu inapproprié ou illégal',
    description: 'Contenu haineux, illégal ou ne respectant pas les règles communautaires.',
  },
  {
    id: 'dangerous',
    label: 'Fichier corrompu ou crash',
    description: 'Le fichier ne s\'ouvre pas ou provoque un dysfonctionnement sérieux.',
  },
  {
    id: 'other',
    label: 'Autre motif',
    description: 'Toute autre raison nécessitant l\'intervention de l\'administrateur.',
  },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  project,
  currentUser,
  onShowToast,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('malicious');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onShowToast('Vous devez être connecté pour signaler un projet.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await submitProjectReport({
        projectId: project.id,
        projectName: project.name,
        reporterId: currentUser.uid,
        reporterEmail: currentUser.email,
        reason: selectedReason,
        details: details.trim() || undefined,
      });

      setSubmitted(true);
      onShowToast('Signalement transmis à l\'équipe de modération.', 'success');
      setTimeout(() => {
        setSubmitted(false);
        setDetails('');
        onClose();
      }, 1800);
    } catch (err: any) {
      onShowToast(err.message || 'Échec de l\'envoi du signalement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
      <div 
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white font-mono">Signalement Enregistré</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              Merci de contribuer à la sécurité et à la qualité d'ORAX PROJET. L'administrateur va examiner ce projet sans délai.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono">Signaler ce Projet</h3>
                <p className="text-xs text-zinc-400 truncate max-w-xs">
                  Projet : <span className="text-zinc-200 font-medium">{project.name}</span>
                </p>
              </div>
            </div>

            {/* Reasons list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Motif du signalement
              </label>
              {REPORT_REASONS.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedReason(r.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedReason === r.id
                      ? 'bg-rose-950/40 border-rose-500/50 text-white'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-200">{r.label}</p>
                    <input 
                      type="radio" 
                      name="reportReason" 
                      checked={selectedReason === r.id} 
                      onChange={() => setSelectedReason(r.id)}
                      className="accent-rose-500"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{r.description}</p>
                </div>
              ))}
            </div>

            {/* Additional details */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Précisions supplémentaires (Facultatif)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Expliquez en quelques mots ce qui pose problème avec ce projet..."
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Envoyer le signalement
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
