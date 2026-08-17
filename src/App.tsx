import React, { useState, useEffect, useMemo } from 'react';
import { 
  Project, 
  UserProfile as UserProfileType, 
  FilterOptions, 
  ProjectCategory, 
  SortOption 
} from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { ProjectCard } from './components/ProjectCard';
import { FilterBar } from './components/FilterBar';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { DeveloperProfileModal } from './components/DeveloperProfileModal';
import { PublishModal } from './components/PublishModal';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';
import { EditProjectModal } from './components/EditProjectModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { CategoriesView } from './components/CategoriesView';
import { AdminPanel } from './components/AdminPanel';
import { ReportModal } from './components/ReportModal';
import { DeveloperLeaderboard } from './components/DeveloperLeaderboard';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { ToastProvider, useToast } from './components/Toast';
import { 
  getProjects, 
  getPaginatedProjects,
  subscribeToProjects,
  subscribeToAuth, 
  logoutUser,
  deduplicateProjects,
  isFollowingDeveloper,
  getDevelopersLeaderboard,
  toggleFavoriteProject,
  isProjectFavorited
} from './services/firebase';
import { 
  Flame, 
  Download, 
  Sparkles, 
  Clock, 
  FolderGit2, 
  Layers, 
  ArrowRight, 
  Search,
  CheckCircle2,
  Calendar,
  Upload,
  RefreshCw,
  ChevronDown,
  UserCheck,
  Star,
  Trophy,
  Heart,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function MainApp() {
  const { showToast } = useToast();

  // Navigation State: Added leaderboard, favorites, and dashboard tabs
  const [currentTab, setCurrentTab] = useState<
    'home' | 'projects' | 'categories' | 'popular' | 'leaderboard' | 'favorites' | 'dashboard' | 'profile' | 'admin'
  >('home');
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfileType | null>(null);

  // Filter & Search State
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    category: 'all',
    technology: 'all',
    tag: 'all',
    sortBy: 'recent',
  });

  // Modal States
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [reportingProject, setReportingProject] = useState<Project | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  // Pagination & Cursor State
  const [pageSize, setPageSize] = useState(12);
  const [loadingMore, setLoadingMore] = useState(false);

  // Live Real-Time Projects & Auth Subscriptions
  useEffect(() => {
    setLoadingProjects(true);

    const unsubscribeProjects = subscribeToProjects((liveProjects) => {
      setProjects(deduplicateProjects(liveProjects));
      setLoadingProjects(false);
    });

    const unsubscribeAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeAuth();
    };
  }, []);

  // Synchronize active project in modal if its details change in real-time
  useEffect(() => {
    if (selectedProject) {
      const liveCurrent = projects.find((p) => p.id === selectedProject.id);
      if (
        liveCurrent &&
        (liveCurrent.views !== selectedProject.views ||
          liveCurrent.downloads !== selectedProject.downloads ||
          liveCurrent.rating !== selectedProject.rating ||
          liveCurrent.ratingsCount !== selectedProject.ratingsCount ||
          liveCurrent.favoritesCount !== selectedProject.favoritesCount ||
          liveCurrent.updatedAt !== selectedProject.updatedAt ||
          liveCurrent.name !== selectedProject.name ||
          liveCurrent.status !== selectedProject.status)
      ) {
        setSelectedProject(liveCurrent);
      }
    }
  }, [projects, selectedProject]);

  // Handle Clean URL Routing via URL hash (e.g., /#project/nom-du-projet-abc12345 or /#dev/LordDemon)
  useEffect(() => {
    const handleHashRouting = () => {
      const hash = window.location.hash;
      if (!hash) return;

      if (hash.startsWith('#project/')) {
        const slugOrId = hash.replace('#project/', '').trim();
        if (slugOrId && projects.length > 0) {
          const match = projects.find(
            p => p.slug === slugOrId || p.id === slugOrId || slugOrId.endsWith(p.id.slice(-8))
          );
          if (match) {
            setSelectedProject(match);
          }
        }
      } else if (hash.startsWith('#dev/')) {
        const devName = decodeURIComponent(hash.replace('#dev/', '').trim());
        if (devName) {
          setSelectedDeveloper(devName);
        }
      }
    };

    handleHashRouting();
    window.addEventListener('hashchange', handleHashRouting);
    return () => window.removeEventListener('hashchange', handleHashRouting);
  }, [projects]);

  // Is current user admin
  const isAdmin = currentUser?.isAdmin || currentUser?.email?.toLowerCase() === 'epargnelock@gmail.com';

  // Helper to test if a developer is followed by the current user
  const checkIsFollowed = (devName: string, ownerId?: string) => {
    if (!currentUser) return false;
    return isFollowingDeveloper(devName, currentUser) || (ownerId ? isFollowingDeveloper(ownerId, currentUser) : false);
  };

  // Visible projects for normal users (filters out hidden projects unless owner or admin)
  const visibleProjects = useMemo(() => {
    return deduplicateProjects(projects).filter(p => {
      if (isAdmin) return true;
      if (p.status === 'hidden') {
        return currentUser && (currentUser.uid === p.ownerId || currentUser.uid === 'dev_lord_demon');
      }
      return true;
    });
  }, [projects, isAdmin, currentUser]);

  // Leaderboard ranking calculation
  const leaderboardData = useMemo(() => {
    return getDevelopersLeaderboard(visibleProjects);
  }, [visibleProjects]);

  // User's favorited projects
  const favoriteProjects = useMemo(() => {
    if (!currentUser || !currentUser.favorites) return [];
    const favIds = new Set(currentUser.favorites);
    return visibleProjects.filter(p => favIds.has(p.id));
  }, [visibleProjects, currentUser]);

  // Filtered & Sorted Projects computation with FOLLOWED DEVELOPER TOP PRIORITY
  const filteredProjects = useMemo(() => {
    let result = [...visibleProjects];

    // Search query filter
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.developerName.toLowerCase().includes(q) ||
          (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q) ||
          p.technologies.some((t) => t.toLowerCase().includes(q)) ||
          p.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
        );
      });
    }

    // Category filter
    if (filters.category !== 'all') {
      result = result.filter((p) => p.category === filters.category);
    }

    // Technology filter
    if (filters.technology !== 'all') {
      result = result.filter((p) =>
        p.technologies.some((t) => t.toLowerCase() === filters.technology.toLowerCase())
      );
    }

    // Tag filter
    if (filters.tag !== 'all') {
      result = result.filter((p) =>
        p.tags.some((tg) => tg.toLowerCase() === filters.tag.toLowerCase())
      );
    }

    // Sorting: FOLLOWED DEVELOPER BOOST (always placed at the very top of other projects)
    result.sort((a, b) => {
      const aFollowed = checkIsFollowed(a.developerName, a.ownerId);
      const bFollowed = checkIsFollowed(b.developerName, b.ownerId);

      if (aFollowed && !bFollowed) return -1;
      if (!aFollowed && bFollowed) return 1;

      switch (filters.sortBy) {
        case 'downloads':
          return (b.downloads || 0) - (a.downloads || 0);
        case 'popular': {
          const scoreA = (a.downloads || 0) * 3 + (a.views || 0) + ((a.rating || 0) * 10);
          const scoreB = (b.downloads || 0) * 3 + (b.views || 0) + ((b.rating || 0) * 10);
          return scoreB - scoreA;
        }
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'alpha':
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [visibleProjects, filters, currentUser]);

  // Derived sections for Homepage & Popular view (with followed dev priority)
  const topDownloadedProjects = useMemo(() => {
    return [...visibleProjects]
      .sort((a, b) => {
        const aFollowed = checkIsFollowed(a.developerName, a.ownerId);
        const bFollowed = checkIsFollowed(b.developerName, b.ownerId);
        if (aFollowed && !bFollowed) return -1;
        if (!aFollowed && bFollowed) return 1;
        return (b.downloads || 0) - (a.downloads || 0);
      })
      .slice(0, 6);
  }, [visibleProjects, currentUser]);

  const mostPopularProjects = useMemo(() => {
    return [...visibleProjects]
      .sort((a, b) => {
        const aFollowed = checkIsFollowed(a.developerName, a.ownerId);
        const bFollowed = checkIsFollowed(b.developerName, b.ownerId);
        if (aFollowed && !bFollowed) return -1;
        if (!aFollowed && bFollowed) return 1;
        const scoreA = (a.downloads || 0) * 3 + (a.views || 0) + ((a.rating || 0) * 10);
        const scoreB = (b.downloads || 0) * 3 + (b.views || 0) + ((b.rating || 0) * 10);
        return scoreB - scoreA;
      })
      .slice(0, 6);
  }, [visibleProjects, currentUser]);

  const recentProjects = useMemo(() => {
    return [...visibleProjects]
      .sort((a, b) => {
        const aFollowed = checkIsFollowed(a.developerName, a.ownerId);
        const bFollowed = checkIsFollowed(b.developerName, b.ownerId);
        if (aFollowed && !bFollowed) return -1;
        if (!aFollowed && bFollowed) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 6);
  }, [visibleProjects, currentUser]);

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    return deduplicateProjects(projects).filter((p) => p.ownerId === currentUser.uid || (currentUser.uid === 'dev_lord_demon' && p.developerName.toUpperCase().includes('LORD DEMON')));
  }, [projects, currentUser]);

  // Overall platform metrics
  const totalDownloads = useMemo(() => {
    return deduplicateProjects(projects).reduce((acc, curr) => acc + (curr.downloads || 0), 0);
  }, [projects]);

  // Handlers
  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenPublish = () => {
    if (!currentUser) {
      showToast({
        title: 'Authentification requise',
        message: 'Veuillez vous connecter pour publier un projet.',
        type: 'warning',
      });
      handleOpenAuth('login');
      return;
    }
    setPublishModalOpen(true);
  };

  const handleLogout = async () => {
    await logoutUser();
    showToast({
      title: 'Déconnexion réussie',
      type: 'info',
    });
    if (currentTab === 'profile' || currentTab === 'admin' || currentTab === 'dashboard') {
      setCurrentTab('home');
    }
  };

  const handleProjectPublished = (newProj: Project) => {
    setProjects((prev) => deduplicateProjects([newProj, ...prev]));
    setSelectedProject(newProj);
  };

  const handleProjectUpdated = (updatedProj: Project) => {
    setProjects((prev) => deduplicateProjects(prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))));
    if (selectedProject?.id === updatedProj.id) {
      setSelectedProject(updatedProj);
    }
  };

  const handleProjectDeleted = (id: string) => {
    setProjects((prev) => deduplicateProjects(prev.filter((p) => p.id !== id)));
    if (selectedProject?.id === id) {
      setSelectedProject(null);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast({
        title: 'Connexion requise',
        message: 'Connectez-vous pour ajouter ce projet à vos favoris.',
        type: 'info',
      });
      handleOpenAuth('login');
      return;
    }

    try {
      const res = await toggleFavoriteProject(project.id, currentUser);
      setCurrentUser({ ...currentUser, favorites: res.favorites });
      
      const newFavCount = Math.max(0, (project.favoritesCount || 0) + (res.isFavorited ? 1 : -1));
      handleProjectUpdated({ ...project, favoritesCount: newFavCount });

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
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-cyan-500/25 selection:text-cyan-200">
      
      {/* Header */}
      <Header
        currentTab={currentTab}
        onNavigate={(tab) => {
          if (tab === 'publish') {
            handleOpenPublish();
          } else {
            setCurrentTab(tab as any);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenPublish={handleOpenPublish}
        onLogout={handleLogout}
        searchQuery={filters.search}
        onSearchChange={(q) => {
          setFilters((prev) => ({ ...prev, search: q }));
          if (currentTab !== 'projects' && q.trim()) {
            setCurrentTab('projects');
          }
        }}
      />

      {/* Main Content Area with mobile safe padding */}
      <main className="flex-1 pb-20 lg:pb-0">
        
        {/* VIEW 1: HOME */}
        {currentTab === 'home' && (
          <div className="space-y-16 sm:space-y-20 pb-20">
            {/* Hero Banner */}
            <HeroSection
              totalProjects={projects.length}
              totalDownloads={totalDownloads}
              onExplore={() => {
                setCurrentTab('projects');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPublish={handleOpenPublish}
              searchQuery={filters.search}
              onSearchChange={(q) => setFilters((prev) => ({ ...prev, search: q }))}
              onSearchSubmit={() => {
                setCurrentTab('projects');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {projects.length === 0 ? (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="p-10 sm:p-12 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-4 max-w-xl mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-bold text-white font-mono">
                    Aucun projet en ligne pour le moment
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    La plateforme affiche uniquement les projets réels de la communauté. Soyez le premier développeur à publier votre code source, script ou bot !
                  </p>
                  <button
                    onClick={handleOpenPublish}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
                  >
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>Publier un premier projet</span>
                  </button>
                </div>
              </section>
            ) : (
              <>
                {/* Popular Projects Section */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-amber-400" />
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                          🔥 Projets Populaires
                        </h2>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Les créations réelles les plus consultées et téléchargées par la communauté
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, sortBy: 'popular' }));
                        setCurrentTab('projects');
                      }}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <span>Voir tout</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mostPopularProjects.slice(0, 3).map((project, i) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onSelect={setSelectedProject}
                        onSelectDeveloper={setSelectedDeveloper}
                        onToggleFavorite={handleToggleFavorite}
                        currentUser={currentUser}
                        isFollowedDeveloper={checkIsFollowed(project.developerName, project.ownerId)}
                        index={i}
                      />
                    ))}
                  </div>
                </section>

                {/* Top Downloaded Section */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                          ⬇️ Les Plus Téléchargés
                        </h2>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Les archives et codes sources avec les véritables compteurs de téléchargement
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, sortBy: 'downloads' }));
                        setCurrentTab('projects');
                      }}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <span>Voir le classement</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topDownloadedProjects.slice(0, 3).map((project, i) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onSelect={setSelectedProject}
                        onSelectDeveloper={setSelectedDeveloper}
                        onToggleFavorite={handleToggleFavorite}
                        currentUser={currentUser}
                        isFollowedDeveloper={checkIsFollowed(project.developerName, project.ownerId)}
                        index={i}
                      />
                    ))}
                  </div>
                </section>

                {/* Recent Uploads Section */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400" />
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                          🆕 Récemment Ajoutés
                        </h2>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Dernières publications mises en ligne par les développeurs
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, sortBy: 'recent' }));
                        setCurrentTab('projects');
                      }}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <span>Explorer le flux</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentProjects.slice(0, 3).map((project, i) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onSelect={setSelectedProject}
                        onSelectDeveloper={setSelectedDeveloper}
                        onToggleFavorite={handleToggleFavorite}
                        currentUser={currentUser}
                        isFollowedDeveloper={checkIsFollowed(project.developerName, project.ownerId)}
                        index={i}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Call to action publication banner */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="relative rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-cyan-950/60 border border-zinc-800 p-8 sm:p-12 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-3 text-center md:text-left max-w-xl">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                    Vous avez créé un projet ou un script utile ?
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Mettez votre code en valeur, obtenez des retours de la communauté et permettez à des milliers d'utilisateurs de télécharger vos applications.
                  </p>
                </div>
                <button
                  onClick={handleOpenPublish}
                  className="px-7 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-base shadow-xl shadow-cyan-500/25 transition-all transform active:scale-95 shrink-0"
                >
                  Publier mon projet maintenant
                </button>
              </div>
            </section>

          </div>
        )}

        {/* VIEW 2: ALL PROJECTS (SEARCH, FILTER & SORT) */}
        {currentTab === 'projects' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header & Filter Bar */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  Tous les Projets
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Recherchez, filtrez et téléchargez librement tous les projets partagés
                </p>
              </div>

              <FilterBar
                filters={filters}
                onChange={setFilters}
                totalResults={filteredProjects.length}
              />
            </div>

            {/* Projects Grid */}
            {loadingProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-80 rounded-2xl bg-zinc-900/60 border border-zinc-800 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.slice(0, pageSize).map((project, idx) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSelect={setSelectedProject}
                      onSelectDeveloper={setSelectedDeveloper}
                      onToggleFavorite={handleToggleFavorite}
                      currentUser={currentUser}
                      isFollowedDeveloper={checkIsFollowed(project.developerName, project.ownerId)}
                      index={idx}
                    />
                  ))}
                </div>

                {/* Pagination / Charger Plus Controls */}
                {filteredProjects.length > pageSize && (
                  <div className="pt-6 pb-2 flex flex-col items-center justify-center gap-3">
                    <div className="text-xs text-zinc-400 font-mono">
                      Affichage de <span className="text-cyan-400 font-semibold">{Math.min(pageSize, filteredProjects.length)}</span> sur <span className="text-white font-semibold">{filteredProjects.length}</span> projets
                    </div>

                    <button
                      id="load-more-projects-btn"
                      onClick={() => {
                        setLoadingMore(true);
                        setTimeout(() => {
                          setPageSize((prev) => prev + 12);
                          setLoadingMore(false);
                        }, 200);
                      }}
                      disabled={loadingMore}
                      className="px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-semibold text-sm border border-zinc-700/80 shadow-lg hover:border-cyan-500/50 hover:text-cyan-300 transition-all flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                          <span>Chargement...</span>
                        </>
                      ) : (
                        <>
                          <span>Charger plus de projets</span>
                          <ChevronDown className="w-4 h-4 text-cyan-400" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Aucun projet ne correspond à votre recherche
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Essayez d'autres mots-clés ou réinitialisez vos critères de filtrage.
                </p>
                <button
                  onClick={() =>
                    setFilters({
                      search: '',
                      category: 'all',
                      technology: 'all',
                      tag: 'all',
                      sortBy: 'recent',
                    })
                  }
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: CATEGORIES */}
        {currentTab === 'categories' && (
          <CategoriesView
            projects={visibleProjects}
            onSelectCategory={(catId) => {
              setFilters((prev) => ({ ...prev, category: catId }));
              setCurrentTab('projects');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* VIEW 4: POPULAR */}
        {currentTab === 'popular' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
                <Flame className="w-3.5 h-3.5" />
                <span>Classement & Tendances</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                Palmarès des Projets
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Découvrez les projets en tête du classement selon les statistiques de téléchargements et de notes.
              </p>
            </div>

            {visibleProjects.length === 0 ? (
              <div className="p-10 sm:p-12 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-4 max-w-xl mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <Flame className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-white font-mono">
                  Aucun projet classé pour l'instant
                </h2>
                <button
                  onClick={handleOpenPublish}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>Publier mon projet</span>
                </button>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Popular Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                    <Flame className="w-5 h-5 text-amber-400" />
                    <h2 className="text-xl font-bold text-white font-mono">🔥 Projets Populaires</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mostPopularProjects.map((project, i) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onSelect={setSelectedProject}
                        onSelectDeveloper={setSelectedDeveloper}
                        onToggleFavorite={handleToggleFavorite}
                        currentUser={currentUser}
                        isFollowedDeveloper={checkIsFollowed(project.developerName, project.ownerId)}
                        index={i}
                      />
                    ))}
                  </div>
                </div>

                {/* Top Downloaded Section */}
                <div className="space-y-6 pt-6">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                    <Download className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-xl font-bold text-white font-mono">⬇️ Les Plus Téléchargés</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topDownloadedProjects.map((project, i) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onSelect={setSelectedProject}
                        onSelectDeveloper={setSelectedDeveloper}
                        onToggleFavorite={handleToggleFavorite}
                        currentUser={currentUser}
                        isFollowedDeveloper={checkIsFollowed(project.developerName, project.ownerId)}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: CLASSEMENT DES DÉVELOPPEURS (LEADERBOARD) */}
        {currentTab === 'leaderboard' && (
          <DeveloperLeaderboard
            leaderboard={leaderboardData}
            onSelectDeveloper={(devName) => setSelectedDeveloper(devName)}
            onSelectProject={(proj) => setSelectedProject(proj)}
            followedDevelopers={currentUser?.following || []}
          />
        )}

        {/* VIEW 6: FAVORITES */}
        {currentTab === 'favorites' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-bold mb-2">
                  <Heart className="w-3.5 h-3.5 fill-rose-400" />
                  <span>Vos Projets Enregistrés</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  Mes Favoris ({favoriteProjects.length})
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Retrouvez en un clic tous les projets et applications que vous avez épinglés.
                </p>
              </div>

              <button
                onClick={() => setCurrentTab('projects')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Découvrir plus de projets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {favoriteProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteProjects.map((project, idx) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSelect={setSelectedProject}
                    onSelectDeveloper={setSelectedDeveloper}
                    onToggleFavorite={handleToggleFavorite}
                    currentUser={currentUser}
                    isFollowedDeveloper={checkIsFollowed(project.developerName, project.ownerId)}
                    index={idx}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-4 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <Heart className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Aucun favori pour le moment</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Cliquez sur l'icône de cœur ❤️ sur n'importe quel projet pour le sauvegarder et le retrouver facilement ici.
                </p>
                <button
                  onClick={() => setCurrentTab('projects')}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Explorer les projets</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 7: DEVELOPER DASHBOARD */}
        {currentTab === 'dashboard' && currentUser && (
          <DeveloperDashboard
            user={currentUser}
            userProjects={userProjects}
            allProjects={visibleProjects}
            onOpenPublish={handleOpenPublish}
            onEditProject={(p) => setEditingProject(p)}
            onSelectProject={(p) => setSelectedProject(p)}
          />
        )}

        {/* VIEW 8: USER PROFILE */}
        {currentTab === 'profile' && currentUser && (
          <UserProfile
            user={currentUser}
            userProjects={userProjects}
            onSelectProject={setSelectedProject}
            onEditProject={setEditingProject}
            onDeleteProject={setDeletingProject}
            onOpenPublish={handleOpenPublish}
            onSelectDeveloper={setSelectedDeveloper}
            onUpdateUser={(updated) => setCurrentUser(updated)}
          />
        )}

        {/* VIEW 9: ADMIN PANEL (LORD DEMON) */}
        {currentTab === 'admin' && (
          <AdminPanel
            currentUser={currentUser}
            projects={projects}
            onOpenDetail={setSelectedProject}
            onRefreshData={() => {
              getProjects().then((projs) => setProjects(deduplicateProjects(projs)));
            }}
            onShowToast={(msg, type) => {
              showToast({
                title: msg,
                type: type || 'info',
              });
            }}
          />
        )}

      </main>

      {/* Footer */}
      <Footer
        onNavigate={(tab) => {
          if (tab === 'publish') {
            handleOpenPublish();
          } else {
            setCurrentTab(tab as any);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onSelectCategory={(catId) => {
          setFilters((prev) => ({ ...prev, category: catId as ProjectCategory }));
          setCurrentTab('projects');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectDeveloper={(devName) => {
          setSelectedDeveloper(devName);
        }}
      />

      {/* Bottom Mobile Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-2 py-2">
        <div className="flex items-center justify-around">
          <button
            onClick={() => {
              setCurrentTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentTab === 'home' ? 'text-cyan-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px]">Accueil</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('projects');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentTab === 'projects' ? 'text-cyan-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FolderGit2 className="w-5 h-5" />
            <span className="text-[10px]">Projets</span>
          </button>

          {/* Mobile Fast Center Publish Button */}
          <button
            onClick={handleOpenPublish}
            className="flex flex-col items-center -mt-5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-zinc-950 p-3 rounded-2xl shadow-lg shadow-cyan-500/30 active:scale-95 transition-transform"
          >
            <Upload className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            onClick={() => {
              setCurrentTab('leaderboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentTab === 'leaderboard' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[10px]">Classement</span>
          </button>

          <button
            onClick={() => {
              if (currentUser) {
                setCurrentTab('profile');
              } else {
                handleOpenAuth('login');
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentTab === 'profile' ? 'text-cyan-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {currentUser ? (
              <img
                src={currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.displayName)}`}
                alt={currentUser.displayName}
                className="w-5 h-5 rounded-full object-cover border border-cyan-500/40"
              />
            ) : (
              <Flame className="w-5 h-5" />
            )}
            <span className="text-[10px]">{currentUser ? 'Profil' : 'Top'}</span>
          </button>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailModal
            project={selectedProject}
            onClose={() => {
              setSelectedProject(null);
              // clear hash without jump
              if (window.location.hash.startsWith('#project/')) {
                history.replaceState(null, '', ' ');
              }
            }}
            currentUser={currentUser}
            onEdit={(p) => {
              setSelectedProject(null);
              setEditingProject(p);
            }}
            onDelete={(p) => {
              setSelectedProject(null);
              setDeletingProject(p);
            }}
            onReport={(p) => {
              setReportingProject(p);
            }}
            onSelectDeveloper={(devName) => {
              setSelectedDeveloper(devName);
            }}
            onOpenAuth={() => handleOpenAuth('login')}
            onProjectUpdated={handleProjectUpdated}
            onUpdateUser={(updated) => setCurrentUser(updated)}
          />
        )}
      </AnimatePresence>

      {/* Developer Profile Modal */}
      <AnimatePresence>
        {selectedDeveloper && (
          <DeveloperProfileModal
            developerIdentifier={selectedDeveloper}
            allProjects={visibleProjects}
            currentUser={currentUser}
            onClose={() => {
              setSelectedDeveloper(null);
              if (window.location.hash.startsWith('#dev/')) {
                history.replaceState(null, '', ' ');
              }
            }}
            onSelectProject={(p) => {
              setSelectedDeveloper(null);
              setSelectedProject(p);
            }}
            onOpenAuth={() => handleOpenAuth('login')}
            onUpdateUser={(updated) => setCurrentUser(updated)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportingProject && (
          <ReportModal
            isOpen={!!reportingProject}
            project={reportingProject}
            currentUser={currentUser}
            onClose={() => setReportingProject(null)}
            onShowToast={(msg, type) => {
              showToast({
                title: msg,
                type: type || 'info',
              });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {publishModalOpen && (
          <PublishModal
            onClose={() => setPublishModalOpen(false)}
            currentUser={currentUser}
            onProjectPublished={handleProjectPublished}
            onOpenAuth={() => handleOpenAuth('login')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {authModalOpen && (
          <AuthModal
            isOpen={authModalOpen}
            initialMode={authInitialMode}
            onClose={() => setAuthModalOpen(false)}
            onSuccess={(user) => {
              setCurrentUser(user);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingProject && (
          <EditProjectModal
            project={editingProject}
            onClose={() => setEditingProject(null)}
            onUpdated={handleProjectUpdated}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingProject && (
          <DeleteConfirmModal
            project={deletingProject}
            currentUser={currentUser}
            onClose={() => setDeletingProject(null)}
            onDeleted={handleProjectDeleted}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
