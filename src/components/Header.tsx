import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Search, 
  Menu, 
  X, 
  User as UserIcon, 
  LogOut, 
  FolderGit2, 
  Sparkles, 
  Layers, 
  Flame, 
  Check, 
  ShieldCheck, 
  Cloud,
  CloudOff,
  RefreshCw,
  ChevronDown,
  Trophy,
  Heart,
  LayoutDashboard,
  UserCheck
} from 'lucide-react';
import { UserProfile, CloudSyncState } from '../types';
import { isFirebaseConfigured, subscribeToSyncStatus } from '../services/firebase';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenPublish: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  onOpenAuth,
  onOpenPublish,
  onLogout,
  searchQuery,
  onSearchChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncState>('synced');
  const isCloudActive = isFirebaseConfigured();

  useEffect(() => {
    const unsub = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsub();
  }, []);

  const handleNavClick = (tab: string) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const favoritesCount = currentUser?.favorites?.length || 0;

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand Logo */}
          <div 
            id="brand-logo-btn"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <FolderGit2 className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg sm:text-xl text-white font-mono">
                  ORAX<span className="text-cyan-400">PROJET</span>
                </span>
                
                {/* Sync & Connectivity State Pill */}
                {syncStatus === 'synced' && isCloudActive && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60" title="Firestore connecté & synchronisé">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Synchronisé
                  </span>
                )}

                {syncStatus === 'syncing' && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60" title="Synchronisation Firestore en cours...">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    Synchronisation
                  </span>
                )}

                {(syncStatus === 'offline' || !isCloudActive) && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60" title="Mode hors connexion - Cache local actif">
                    <CloudOff className="w-2.5 h-2.5" />
                    Hors connexion (Cache)
                  </span>
                )}

                {syncStatus === 'error' && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60" title="Erreur de connexion Firestore">
                    <CloudOff className="w-2.5 h-2.5" />
                    Non synchronisé
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 -mt-0.5 hidden xs:block">
                Plateforme de Partage Dev
              </p>
            </div>
          </div>

          {/* Search Bar - Desktop center */}
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md mx-2">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                id="header-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher un projet, bot, script, dev..."
                className="w-full bg-zinc-900/90 hover:bg-zinc-900 text-sm text-zinc-200 placeholder-zinc-500 pl-10 pr-4 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
              />
              {searchQuery && (
                <button 
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
            <button
              id="nav-home-btn"
              onClick={() => handleNavClick('home')}
              className={`px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors ${
                currentTab === 'home'
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Accueil
            </button>
            <button
              id="nav-projects-btn"
              onClick={() => handleNavClick('projects')}
              className={`px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors ${
                currentTab === 'projects'
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Projets
            </button>
            <button
              id="nav-categories-btn"
              onClick={() => handleNavClick('categories')}
              className={`px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors flex items-center gap-1 ${
                currentTab === 'categories'
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Catégories
            </button>
            <button
              id="nav-popular-btn"
              onClick={() => handleNavClick('popular')}
              className={`px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors flex items-center gap-1 ${
                currentTab === 'popular'
                  ? 'text-amber-400 bg-amber-950/30 border border-amber-800/40'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Populaires
            </button>
            
            {/* Classement des Développeurs */}
            <button
              id="nav-leaderboard-btn"
              onClick={() => handleNavClick('leaderboard')}
              className={`px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors flex items-center gap-1 ${
                currentTab === 'leaderboard'
                  ? 'text-amber-300 bg-amber-950/40 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'text-zinc-300 hover:text-amber-300 hover:bg-zinc-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Classement
            </button>

            {/* Favoris */}
            <button
              id="nav-favorites-btn"
              onClick={() => handleNavClick('favorites')}
              className={`px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors flex items-center gap-1 ${
                currentTab === 'favorites'
                  ? 'text-rose-400 bg-rose-950/30 border border-rose-800/40'
                  : 'text-zinc-300 hover:text-rose-400 hover:bg-zinc-900'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favoritesCount > 0 ? 'fill-rose-400 text-rose-400' : 'text-zinc-400'}`} />
              <span>Favoris</span>
              {favoritesCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Dashboard Développeur (si connecté) */}
            {currentUser && (
              <button
                id="nav-dashboard-btn"
                onClick={() => handleNavClick('dashboard')}
                className={`px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors flex items-center gap-1 ${
                  currentTab === 'dashboard'
                    ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40'
                    : 'text-zinc-300 hover:text-cyan-300 hover:bg-zinc-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
                Dashboard
              </button>
            )}

            {currentUser && (currentUser.isAdmin || currentUser.email?.toLowerCase() === 'epargnelock@gmail.com') && (
              <button
                id="nav-admin-btn"
                onClick={() => handleNavClick('admin')}
                className={`px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors flex items-center gap-1 ${
                  currentTab === 'admin'
                    ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Admin
              </button>
            )}
          </nav>

          {/* Action Buttons: Publish + User/Auth */}
          <div className="flex items-center gap-2">
            {/* Publish Button */}
            <button
              id="header-publish-btn"
              onClick={onOpenPublish}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all transform active:scale-95 shrink-0"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline">Publier un projet</span>
              <span className="xs:hidden">Publier</span>
            </button>

            {/* Auth or User Profile */}
            {currentUser ? (
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-left"
                >
                  <img
                    src={currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.displayName)}`}
                    alt={currentUser.displayName}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-800 object-cover border border-zinc-700"
                  />
                  <div className="hidden sm:block text-xs">
                    <p className="font-semibold text-zinc-200 leading-tight truncate max-w-[90px]">
                      {currentUser.displayName}
                    </p>
                    <span className="text-[10px] text-cyan-400 font-mono">Dev</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in-50 slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                      <p className="text-[11px] text-zinc-400">Connecté en tant que</p>
                      <p className="text-sm font-semibold text-white truncate">{currentUser.displayName}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      id="dropdown-dashboard-btn"
                      onClick={() => handleNavClick('dashboard')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-zinc-800/80 rounded-lg transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                      Dashboard Développeur
                    </button>

                    <button
                      id="dropdown-favorites-btn"
                      onClick={() => handleNavClick('favorites')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
                    >
                      <Heart className="w-4 h-4 text-rose-400" />
                      <span>Mes Favoris</span>
                      {favoritesCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.2 rounded text-[10px] bg-rose-500 text-white font-mono">
                          {favoritesCount}
                        </span>
                      )}
                    </button>

                    <button
                      id="dropdown-my-profile-btn"
                      onClick={() => handleNavClick('profile')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-cyan-400" />
                      Mon Profil Développeur
                    </button>

                    <button
                      id="dropdown-publish-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenPublish();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
                    >
                      <Upload className="w-4 h-4 text-blue-400" />
                      Nouveau Projet
                    </button>

                    {(currentUser.isAdmin || currentUser.email?.toLowerCase() === 'epargnelock@gmail.com') && (
                      <button
                        id="dropdown-admin-btn"
                        onClick={() => handleNavClick('admin')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/40 rounded-lg transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        Console Admin LORD DEMON
                      </button>
                    )}

                    <div className="border-t border-zinc-800 mt-1 pt-1">
                      <button
                        id="dropdown-logout-btn"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  id="header-login-btn"
                  onClick={() => onOpenAuth('login')}
                  className="px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
                >
                  Connexion
                </button>
                <button
                  id="header-register-btn"
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 transition-all"
                >
                  Inscription
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher projets, bots, devs..."
              className="w-full bg-zinc-900 text-xs text-zinc-200 placeholder-zinc-500 pl-9 pr-4 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-zinc-950 border-b border-zinc-800 px-4 pt-2 pb-6 space-y-2 animate-in slide-in-from-top-2">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
              currentTab === 'home' ? 'text-cyan-400 bg-cyan-950/50' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span>Accueil</span>
          </button>
          <button
            onClick={() => handleNavClick('projects')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
              currentTab === 'projects' ? 'text-cyan-400 bg-cyan-950/50' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span>Tous les projets</span>
          </button>
          <button
            onClick={() => handleNavClick('categories')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
              currentTab === 'categories' ? 'text-cyan-400 bg-cyan-950/50' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span>Catégories</span>
            <Layers className="w-4 h-4 text-zinc-500" />
          </button>
          <button
            onClick={() => handleNavClick('popular')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
              currentTab === 'popular' ? 'text-amber-400 bg-amber-950/50' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span>Populaires</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={() => handleNavClick('leaderboard')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
              currentTab === 'leaderboard' ? 'text-amber-300 bg-amber-950/50' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span>Classement des Développeurs</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={() => handleNavClick('favorites')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
              currentTab === 'favorites' ? 'text-rose-400 bg-rose-950/50' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span>Mes Favoris ({favoritesCount})</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </button>
          {currentUser && (
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
                currentTab === 'dashboard' ? 'text-cyan-400 bg-cyan-950/50' : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <span>Dashboard Développeur</span>
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
            </button>
          )}
          {currentUser && (
            <button
              onClick={() => handleNavClick('profile')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
                currentTab === 'profile' ? 'text-cyan-400 bg-cyan-950/50' : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <span>Mon Profil</span>
              <UserIcon className="w-4 h-4 text-cyan-400" />
            </button>
          )}
        </div>
      )}
    </header>
  );
};
