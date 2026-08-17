import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  FolderGit2, 
  Download, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Star, 
  ExternalLink, 
  Clock, 
  User, 
  Filter, 
  RefreshCw,
  Search,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { Project, UserProfile, ProjectReport, ProjectStatus, ReportStatus } from '../types';
import { 
  getProjectReports, 
  updateReportStatus, 
  updateProjectStatus, 
  deleteExistingProject,
  isFirebaseConfigured,
  formatFileSize
} from '../services/firebase';

interface AdminPanelProps {
  currentUser: UserProfile | null;
  projects: Project[];
  onOpenDetail: (project: Project) => void;
  onRefreshData?: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  projects,
  onOpenDetail,
  onRefreshData,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'projects' | 'stats'>('reports');
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = currentUser?.isAdmin || currentUser?.email?.toLowerCase() === 'epargnelock@gmail.com';
  const isCloud = isFirebaseConfigured();

  // Load reports
  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const data = await getProjectReports();
      setReports(data);
    } catch (err: any) {
      onShowToast('Erreur lors du chargement des signalements', 'error');
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchReports();
    }
  }, [isAdmin]);

  // Aggregate stats
  const totalDownloads = projects.reduce((acc, p) => acc + (p.downloads || 0), 0);
  const totalViews = projects.reduce((acc, p) => acc + (p.views || 0), 0);
  const pendingReports = reports.filter(r => r.status === 'pending');

  const handleUpdateReport = async (reportId: string, status: ReportStatus) => {
    setActionLoading(`report-${reportId}`);
    try {
      await updateReportStatus(reportId, status);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      onShowToast(`Signalement mis à jour (${status})`, 'success');
    } catch (err: any) {
      onShowToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (projectId: string, currentStatus?: ProjectStatus) => {
    const nextStatus: ProjectStatus = currentStatus === 'hidden' ? 'published' : 'hidden';
    setActionLoading(`project-status-${projectId}`);
    try {
      await updateProjectStatus(projectId, nextStatus);
      onShowToast(`Statut du projet mis à jour : ${nextStatus}`, 'success');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProjectAsAdmin = async (projectId: string, projectName: string) => {
    if (!window.confirm(`Confirmer la suppression définitive du projet "${projectName}" ?`)) {
      return;
    }
    setActionLoading(`project-del-${projectId}`);
    try {
      await deleteExistingProject(projectId, currentUser?.uid || 'admin');
      onShowToast(`Projet "${projectName}" supprimé définitivement`, 'success');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 font-mono">
          Espace Réservé à l'Administration
        </h2>
        <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
          Ce panneau de gestion et de modération est exclusivement accessible au compte administrateur 
          <span className="text-cyan-400 font-mono font-semibold ml-1">LORD DEMON</span> (epargnelock@gmail.com).
        </p>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 max-w-md mx-auto text-xs text-zinc-400">
          Connectez-vous avec vos identifiants administrateur pour accéder à la console de modération et de supervision.
        </div>
      </div>
    );
  }

  // Filtered projects for management table
  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.developerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.ownerEmail && p.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'hidden') return matchesSearch && p.status === 'hidden';
    if (statusFilter === 'featured') return matchesSearch && p.featured;
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in-50">
      
      {/* Header & Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-center gap-2">
                CONSOLE D'ADMINISTRATION
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-sans font-semibold">
                  LORD DEMON
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Surveillance de la plateforme, modération des projets et contrôle des contenus ORAX.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchReports();
              if (onRefreshData) onRefreshData();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Total Projets</span>
            <FolderGit2 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{projects.length}</p>
          <span className="text-[11px] text-zinc-500">Actifs sur la plateforme</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Téléchargements</span>
            <Download className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{totalDownloads}</p>
          <span className="text-[11px] text-emerald-400/80">Compteurs temps réel</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Total Vues</span>
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{totalViews}</p>
          <span className="text-[11px] text-blue-400/80">Consultations enregistrées</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Signalements</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{reports.length}</p>
          <span className={`text-[11px] font-semibold ${pendingReports.length > 0 ? 'text-rose-400 animate-pulse' : 'text-zinc-500'}`}>
            {pendingReports.length} en attente
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'reports'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Signalements & Modération
          {pendingReports.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
              {pendingReports.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'projects'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          Gestion des Projets ({projects.length})
        </button>
      </div>

      {/* TAB 1: MODERATION / REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white font-mono">
              Signalements des Utilisateurs ({reports.length})
            </h3>
          </div>

          {loadingReports ? (
            <div className="py-12 text-center text-zinc-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
              Chargement des signalements...
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-white font-medium mb-1">Aucun signalement en attente</h4>
              <p className="text-xs text-zinc-400">Tous les projets publiés respectent actuellement la charte de la plateforme.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const targetProject = projects.find(p => p.id === report.projectId);

                return (
                  <div 
                    key={report.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      report.status === 'pending'
                        ? 'bg-zinc-900/90 border-amber-500/30 shadow-lg shadow-amber-500/5'
                        : 'bg-zinc-950/70 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                          report.status === 'pending' 
                            ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                            : report.status === 'actioned'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}>
                          {report.status === 'pending' ? 'À Traiter' : report.status === 'actioned' ? 'Sanctionné' : 'Classé sans suite'}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          Motif : <strong className="text-white">{report.reason}</strong>
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-white">
                          Projet concerné : {report.projectName}
                        </p>
                        {targetProject && (
                          <button
                            onClick={() => onOpenDetail(targetProject)}
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            Voir la fiche <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {report.details && (
                        <p className="text-xs text-zinc-300 mt-1 italic bg-zinc-900 p-2 rounded border border-zinc-800">
                          « {report.details} »
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-500 mt-2">
                        Signalé par : {report.reporterEmail || report.reporterId}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/60">
                      {report.status === 'pending' && (
                        <>
                          <button
                            disabled={actionLoading === `report-${report.id}`}
                            onClick={() => handleUpdateReport(report.id, 'dismissed')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                            Classer sans suite
                          </button>

                          {targetProject && (
                            <button
                              disabled={actionLoading === `project-status-${targetProject.id}`}
                              onClick={() => handleToggleStatus(targetProject.id, targetProject.status)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/50 transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {targetProject.status === 'hidden' ? 'Réactiver le projet' : 'Masquer le projet'}
                            </button>
                          )}

                          {targetProject && (
                            <button
                              disabled={actionLoading === `project-del-${targetProject.id}`}
                              onClick={async () => {
                                await handleDeleteProjectAsAdmin(targetProject.id, targetProject.name);
                                await handleUpdateReport(report.id, 'actioned');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/50 transition-colors ml-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Supprimer le projet & Sanctionner
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROJECTS MANAGEMENT */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par titre ou auteur..."
                className="w-full bg-zinc-900 text-xs text-zinc-200 placeholder-zinc-500 pl-9 pr-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="hidden">Masqués uniquement</option>
                <option value="featured">En vedette</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 font-mono uppercase text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Projet</th>
                  <th className="px-4 py-3">Développeur</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Stats</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={project.thumbnail || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=100&auto=format&fit=crop&q=80'} 
                          alt={project.name}
                          className="w-8 h-8 rounded-lg object-cover bg-zinc-800 border border-zinc-700"
                        />
                        <div>
                          <p className="font-semibold text-white">{project.name}</p>
                          <span className="text-[10px] text-zinc-500 font-mono">{project.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-200">{project.developerName}</div>
                      <div className="text-[10px] text-zinc-500 truncate max-w-[120px]">{project.ownerEmail || '—'}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-cyan-400 border border-zinc-700">
                        {project.category}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px]">
                      <span className="text-emerald-400 font-semibold">{project.downloads || 0} dl</span>
                      <span className="text-zinc-500 mx-1">/</span>
                      <span className="text-blue-400">{project.views || 0} vues</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        project.status === 'hidden'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {project.status === 'hidden' ? 'Masqué' : 'Publié'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenDetail(project)}
                          className="p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Voir le projet"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        
                        <button
                          disabled={actionLoading === `project-status-${project.id}`}
                          onClick={() => handleToggleStatus(project.id, project.status)}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                            project.status === 'hidden'
                              ? 'bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {project.status === 'hidden' ? 'Rendre Public' : 'Masquer'}
                        </button>

                        <button
                          disabled={actionLoading === `project-del-${project.id}`}
                          onClick={() => handleDeleteProjectAsAdmin(project.id, project.name)}
                          className="p-1.5 text-rose-400 hover:bg-rose-950/60 rounded-lg transition-colors"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
