import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  runTransaction,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { 
  Project, 
  UserProfile, 
  ProjectReport, 
  ProjectStatus, 
  ReportStatus, 
  CloudSyncState,
  PaginatedProjectsResult,
  FilterOptions,
  ProjectComment,
  DeveloperInfo
} from '../types';
import { deleteStoredFile } from '../utils/fileStorage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    try {
      setLogLevel('silent');
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalForceLongPolling: true,
      });
    } catch {
      db = getFirestore(app);
    }
  } catch (err) {
    console.warn('Firebase initialization notice:', err);
  }
}

// --------------------------------------------------------------------------
// CLOUD SYNCHRONIZATION STATE LISTENER
// --------------------------------------------------------------------------
let currentSyncStatus: CloudSyncState = isFirebaseConfigured() ? (navigator.onLine ? 'synced' : 'offline') : 'offline';
const SYNC_STATUS_EVENT = 'orax_sync_status_changed';

export function getSyncStatus(): CloudSyncState {
  return currentSyncStatus;
}

export function updateSyncStatus(newStatus: CloudSyncState): void {
  if (currentSyncStatus !== newStatus) {
    currentSyncStatus = newStatus;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: newStatus }));
    }
  }
}

export function subscribeToSyncStatus(callback: (status: CloudSyncState) => void): () => void {
  callback(currentSyncStatus);
  const handler = (e: Event) => {
    const custom = e as CustomEvent<CloudSyncState>;
    callback(custom.detail || currentSyncStatus);
  };
  window.addEventListener(SYNC_STATUS_EVENT, handler);
  
  const onlineHandler = () => updateSyncStatus(isFirebaseConfigured() ? 'synced' : 'offline');
  const offlineHandler = () => updateSyncStatus('offline');
  
  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);

  return () => {
    window.removeEventListener(SYNC_STATUS_EVENT, handler);
    window.removeEventListener('online', onlineHandler);
    window.removeEventListener('offline', offlineHandler);
  };
}

// Admin email configured for LORD DEMON admin privileges
const ADMIN_EMAILS = new Set(['epargnelock@gmail.com', 'lord.demon.dev@orax.net']);

export function checkIsAdmin(
  user: UserProfile | { email?: string; uid?: string; isAdmin?: boolean } | null,
  hasCustomClaimAdmin?: boolean
): boolean {
  if (!user) return false;
  if (hasCustomClaimAdmin === true) return true;
  if (user.email && ADMIN_EMAILS.has(user.email.toLowerCase())) return true;
  return false;
}

// Helper to remove any undefined properties before sending to Firestore
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean as T;
}

// --------------------------------------------------------------------------
// LOCAL CACHE ONLY (Used for instant UI paint & offline fallback)
// Firestore is the sole SOURCE OF TRUTH.
// --------------------------------------------------------------------------
const STORAGE_KEY_PROJECTS = 'orax_projet_items_v2';
const STORAGE_KEY_REPORTS = 'orax_projet_reports_v2';
const STORAGE_KEY_SESSION_UI = 'orax_projet_cached_session_v2';

const DEMO_PROJECT_IDS = new Set([
  'orax-bot-v2',
  'cyber-shield-scanner',
  'nexus-ai-studio',
  'pulse-finance-app',
  'hyper-commerce-saas',
  'cyber-rogue-game',
  'devops-automation-toolkit',
  'electron-markdown-studio'
]);

export function deduplicateProjects(projects: Project[]): Project[] {
  const seen = new Set<string>();
  const unique: Project[] = [];
  for (const p of projects) {
    if (p && p.id && !DEMO_PROJECT_IDS.has(p.id) && !seen.has(p.id)) {
      seen.add(p.id);
      unique.push(p);
    }
  }
  return unique;
}

function getLocalProjects(): Project[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (saved) {
      const parsed: Project[] = JSON.parse(saved);
      const unique = deduplicateProjects(parsed);
      if (unique.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(unique));
      }
      return unique;
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
}

function saveLocalProjects(projects: Project[]): void {
  const unique = deduplicateProjects(projects);
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(unique));
}

function getLocalReports(): ProjectReport[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  return [];
}

function saveLocalReports(reports: ProjectReport[]): void {
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
}

export function clearUserPrivateCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION_UI);
    localStorage.removeItem(FOLLOWING_CACHE_KEY);
    localStorage.removeItem(FAVORITES_CACHE_KEY);
  } catch {
    // Ignore storage clear error
  }
}

function getCachedSession(): UserProfile | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SESSION_UI);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.isAdmin = checkIsAdmin(parsed);
      return parsed;
    }
  } catch {
    // Ignore
  }
  return null;
}

function saveCachedSession(user: UserProfile | null): void {
  if (user) {
    user.isAdmin = checkIsAdmin(user);
    localStorage.setItem(STORAGE_KEY_SESSION_UI, JSON.stringify(user));
  } else {
    clearUserPrivateCache();
  }
}

// --------------------------------------------------------------------------
// AUTHENTICATION METHODS (Strictly Firebase Auth - No Mock Account Creation)
// --------------------------------------------------------------------------

export function translateFirebaseError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail est déjà associée à un compte.';
    case 'auth/invalid-email':
      return 'L\'adresse e-mail saisie n\'est pas valide.';
    case 'auth/user-not-found':
      return 'Aucun compte associé à cette adresse e-mail.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou mot de passe incorrect.';
    case 'auth/weak-password':
      return 'Le mot de passe doit comporter au moins 6 caractères.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives échouées. Veuillez patienter avant de réessayer.';
    case 'auth/network-request-failed':
      return 'Erreur de connexion réseau. Vérifiez votre accès internet.';
    case 'auth/user-disabled':
      return 'Ce compte utilisateur a été temporairement désactivé.';
    default:
      return error?.message || 'Une erreur est survenue lors de l\'authentification.';
  }
}

export async function registerUser(
  email: string, 
  password: string, 
  displayName: string,
  customPhotoURL?: string
): Promise<UserProfile> {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Service d\'authentification Firebase non configuré. Veuillez vérifier la configuration réseau.');
  }

  const finalPhotoURL = customPhotoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName || email)}`;
  const cleanDisplayName = displayName.trim() || email.split('@')[0];
  const isAdmin = ADMIN_EMAILS.has(email.toLowerCase());

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    const userProfile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      displayName: cleanDisplayName,
      photoURL: finalPhotoURL,
      createdAt: new Date().toISOString(),
      projectsCount: 0,
      totalDownloads: 0,
      isAdmin,
    };

    // Concurrently trigger Auth profile update and Firestore document creation
    try {
      await updateProfile(cred.user, { 
        displayName: cleanDisplayName,
        photoURL: finalPhotoURL
      });
    } catch (profileErr) {
      console.warn('Profile update notice:', profileErr);
    }

    if (db && isFirebaseConfigured()) {
      try {
        await setDoc(doc(db, 'users', cred.user.uid), sanitizeForFirestore(userProfile));
      } catch (dbErr) {
        console.warn('Firestore user profile document creation error:', dbErr);
      }
    }

    // Save session in local cache
    saveCachedSession(userProfile);

    return userProfile;
  } catch (err: any) {
    throw new Error(translateFirebaseError(err));
  }
}

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Service d\'authentification Firebase non configuré. Impossible de se connecter.');
  }

  const defaultPhotoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
  const isAdmin = ADMIN_EMAILS.has(email.toLowerCase());

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    let userProfile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      displayName: cred.user.displayName || email.split('@')[0],
      photoURL: cred.user.photoURL || defaultPhotoURL,
      createdAt: new Date().toISOString(),
      projectsCount: 0,
      totalDownloads: 0,
      isAdmin,
    };

    userProfile.isAdmin = checkIsAdmin(userProfile);

    // Fetch full Firestore profile as Source of Truth
    if (db && isFirebaseConfigured()) {
      try {
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        if (userDoc && userDoc.exists()) {
          const freshData = userDoc.data() as UserProfile;
          userProfile = { ...userProfile, ...freshData, isAdmin, uid: cred.user.uid };
        } else {
          await setDoc(doc(db, 'users', cred.user.uid), sanitizeForFirestore(userProfile));
        }
      } catch (err) {
        console.warn('Firestore user profile lookup warning:', err);
      }
    }
    
    if (userProfile.favorites) {
      saveLocalFavorites(userProfile.favorites);
    } else {
      saveLocalFavorites([]);
    }
    if (userProfile.following) {
      saveLocalFollowing(userProfile.following);
    } else {
      saveLocalFollowing([]);
    }

    saveCachedSession(userProfile);
    return userProfile;
  } catch (err: any) {
    throw new Error(translateFirebaseError(err));
  }
}

export async function updateUserProfile(
  userId: string, 
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const authUser = auth?.currentUser;
  if (!authUser || (authUser.uid !== userId && !checkIsAdmin({ email: authUser.email || '', uid: authUser.uid }))) {
    throw new Error('Vous n\'êtes pas autorisé à modifier ce profil.');
  }

  const isAdmin = checkIsAdmin({ email: authUser.email || '', uid: authUser.uid });

  // Security: Prevent privilege escalation and immutable UID modification
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isAdmin: _attemptedAdmin, uid: _ignoredUid, ...safeUpdates } = updates;
  const currentSession = getCachedSession();

  const updatedProfile: UserProfile = {
    ...(currentSession || {
      uid: userId,
      email: authUser.email || '',
      displayName: authUser.displayName || 'Dev',
      createdAt: new Date().toISOString(),
    }),
    ...safeUpdates,
    uid: userId,
    isAdmin,
  };

  // 1. Update Firebase Auth if user is currently logged in
  if (authUser.uid === userId) {
    try {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (safeUpdates.displayName) authUpdates.displayName = safeUpdates.displayName;
      if (safeUpdates.photoURL) authUpdates.photoURL = safeUpdates.photoURL;
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(authUser, authUpdates);
      }
    } catch (err) {
      console.warn('Firebase Auth updateProfile warning:', err);
    }
  }

  // 2. Update Firestore document (Source of Truth)
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'users', userId), sanitizeForFirestore(updatedProfile), { merge: true });
    } catch (err: any) {
      throw new Error(err?.message || 'Échec de la mise à jour du profil sur Firestore.');
    }
  }

  if (updatedProfile.favorites) {
    saveLocalFavorites(updatedProfile.favorites);
  }
  if (updatedProfile.following) {
    saveLocalFollowing(updatedProfile.following);
  }

  saveCachedSession(updatedProfile);
  return updatedProfile;
}

export async function logoutUser(): Promise<void> {
  if (auth && isFirebaseConfigured()) {
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
  }
  clearUserPrivateCache();
}

export async function resetUserPassword(email: string): Promise<void> {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Service d\'authentification non disponible pour la réinitialisation.');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err: any) {
    throw new Error(translateFirebaseError(err));
  }
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  // First paint with cached session for UX responsiveness
  const cached = getCachedSession();
  if (cached) {
    callback(cached);
  }

  if (auth && isFirebaseConfigured()) {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const defaultPhotoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.displayName || fbUser.email || 'dev')}`;
        
        let hasCustomAdminClaim = false;
        try {
          const tokenResult = await fbUser.getIdTokenResult();
          hasCustomAdminClaim = tokenResult.claims.admin === true;
        } catch {
          // Non-blocking token error
        }

        const isAdmin = checkIsAdmin({ email: fbUser.email || '', uid: fbUser.uid }, hasCustomAdminClaim);

        let profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Utilisateur',
          photoURL: fbUser.photoURL || defaultPhotoURL,
          createdAt: new Date().toISOString(),
          isAdmin,
        };
        if (db) {
          try {
            const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              profile = { 
                ...profile, 
                ...userData,
                isAdmin,
                uid: fbUser.uid,
              };
            } else {
              await setDoc(doc(db, 'users', fbUser.uid), sanitizeForFirestore(profile), { merge: true });
            }
          } catch {
            // fallback to auth profile
          }
        }
        profile.isAdmin = isAdmin;

        // Isolate and load user private favorites/following
        if (profile.favorites) {
          saveLocalFavorites(profile.favorites);
        } else {
          saveLocalFavorites([]);
        }
        if (profile.following) {
          saveLocalFollowing(profile.following);
        } else {
          saveLocalFollowing([]);
        }

        saveCachedSession(profile);
        callback(profile);
      } else {
        clearUserPrivateCache();
        callback(null);
      }
    });
  }

  callback(null);
  return () => {};
}

// --------------------------------------------------------------------------
// POPULARITY ALGORITHM
// --------------------------------------------------------------------------

/**
 * Calculates a balanced popularity score based on downloads (x3), views (x1),
 * and recency decay so new active projects can trend without being permanently locked behind historical numbers.
 */
export function calculatePopularityScore(project: Project): number {
  const downloads = project.downloads || 0;
  const views = project.views || 0;
  const createdTime = new Date(project.createdAt || Date.now()).getTime();
  const daysSinceCreation = Math.max(0, (Date.now() - createdTime) / (1000 * 60 * 60 * 24));
  
  // Recency decay factor (newer projects have multiplier up to 1.0, older projects decay gradually to 0.3)
  const recencyFactor = Math.max(0.3, 1 / (1 + daysSinceCreation * 0.03));
  const baseScore = (downloads * 3 + views * 1) * recencyFactor;
  const featuredBonus = project.featured ? 25 : 0;
  
  return Math.round(baseScore + featuredBonus);
}

// --------------------------------------------------------------------------
// FIRESTORE & PROJECT SERVICES
// --------------------------------------------------------------------------

const PROJECTS_CHANGE_EVENT = 'orax_projects_changed';

export function broadcastProjectsChange(projects: Project[]): void {
  if (typeof window !== 'undefined') {
    const unique = deduplicateProjects(projects);
    window.dispatchEvent(new CustomEvent(PROJECTS_CHANGE_EVENT, { detail: unique }));
  }
}

/**
 * Real-time subscription to projects:
 * Synchronizes across Firestore onSnapshot, in-window events, and cross-tab storage changes.
 */
export function subscribeToProjects(callback: (projects: Project[]) => void): () => void {
  // 1. Immediately provide cached/local data
  const initial = getLocalProjects();
  callback(initial);

  let unsubscribeFirestore: (() => void) | null = null;

  // 2. Attach live Firestore listener
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot) {
            const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
            const realOnly = deduplicateProjects(fetched);
            // Authoritative Firestore synchronization:
            // - Adds new projects from Firestore to cache
            // - Removes deleted projects from cache
            // - Updates modified projects (Firestore wins)
            saveLocalProjects(realOnly);
            updateSyncStatus(navigator.onLine ? 'synced' : 'offline');
            callback(realOnly);
          }
        },
        (err) => {
          console.warn('Firestore real-time snapshot notice:', err);
          updateSyncStatus(navigator.onLine ? 'error' : 'offline');
        }
      );
    } catch (err) {
      console.warn('Firestore onSnapshot init error:', err);
    }
  }

  // 3. Custom event listener for instant reactive updates within the app
  const handleCustomChange = (e: Event) => {
    const customEvent = e as CustomEvent<Project[]>;
    if (customEvent.detail) {
      callback(deduplicateProjects(customEvent.detail));
    } else {
      callback(getLocalProjects());
    }
  };

  // 4. Cross-tab storage change listener
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_PROJECTS) {
      callback(getLocalProjects());
    }
  };

  window.addEventListener(PROJECTS_CHANGE_EVENT, handleCustomChange);
  window.addEventListener('storage', handleStorageChange);

  return () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
    window.removeEventListener(PROJECTS_CHANGE_EVENT, handleCustomChange);
    window.removeEventListener('storage', handleStorageChange);
  };
}

export async function getProjects(): Promise<Project[]> {
  if (!db || !isFirebaseConfigured()) {
    // If Firebase is not configured, fallback to cached data with offline sync state
    updateSyncStatus('offline');
    return getLocalProjects();
  }

  try {
    updateSyncStatus('syncing');
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    if (snapshot) {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      const realOnly = deduplicateProjects(fetched);
      saveLocalProjects(realOnly);
      updateSyncStatus(navigator.onLine ? 'synced' : 'offline');
      return realOnly;
    }
  } catch (err) {
    updateSyncStatus(navigator.onLine ? 'error' : 'offline');
    console.warn('Firestore getProjects network notice, using local cache:', err);
  }

  return getLocalProjects();
}

export interface FetchPaginatedOptions {
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null;
  filters?: Partial<FilterOptions>;
  isAdmin?: boolean;
  userId?: string;
}

/**
 * Server-side Firestore pagination with cursor (startAfter) and compound filters.
 * Capable of scaling effortlessly from 1,000 to 100,000+ projects without downloading full collections.
 */
export async function getPaginatedProjects(
  options: FetchPaginatedOptions = {}
): Promise<PaginatedProjectsResult> {
  const {
    pageSize = 12,
    lastDoc = null,
    filters = {},
    isAdmin = false,
    userId = '',
  } = options;

  if (!db || !isFirebaseConfigured()) {
    // Client-side fallback pagination over local cache
    updateSyncStatus('offline');
    const all = getLocalProjects().filter(p => {
      if (isAdmin) return true;
      if (p.status === 'hidden') return p.ownerId === userId;
      return p.status === 'published' || !p.status;
    });

    let filtered = [...all];
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    if (filters.technology && filters.technology !== 'all') {
      const techLower = filters.technology.toLowerCase();
      filtered = filtered.filter(p => p.technologies.some(t => t.toLowerCase() === techLower));
    }
    if (filters.tag && filters.tag !== 'all') {
      const tagLower = filters.tag.toLowerCase();
      filtered = filtered.filter(p => p.tags.some(t => t.toLowerCase() === tagLower));
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.developerName.toLowerCase().includes(q) ||
        (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
        p.description.toLowerCase().includes(q) ||
        p.technologies.some(t => t.toLowerCase().includes(q)) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'downloads':
          return (b.downloads || 0) - (a.downloads || 0);
        case 'popular':
          return ((b.downloads || 0) * 3 + (b.views || 0)) - ((a.downloads || 0) * 3 + (a.views || 0));
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'alpha':
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return {
      projects: filtered.slice(0, pageSize),
      hasMore: filtered.length > pageSize,
      lastDocSnapshot: null,
      totalEstimate: filtered.length
    };
  }

  try {
    updateSyncStatus('syncing');
    const projectsCol = collection(db, 'projects');
    const queryConstraints: any[] = [];

    // 1. Status Filter (Public vs Admin)
    if (!isAdmin) {
      queryConstraints.push(where('status', '==', 'published'));
    }

    // 2. Category Filter at query level
    if (filters.category && filters.category !== 'all') {
      queryConstraints.push(where('category', '==', filters.category));
    }

    // 3. Sorting & Order Constraints
    switch (filters.sortBy) {
      case 'downloads':
        queryConstraints.push(orderBy('downloads', 'desc'));
        queryConstraints.push(orderBy('createdAt', 'desc'));
        break;
      case 'oldest':
        queryConstraints.push(orderBy('createdAt', 'asc'));
        break;
      case 'alpha':
        queryConstraints.push(orderBy('name', 'asc'));
        queryConstraints.push(orderBy('createdAt', 'desc'));
        break;
      case 'popular':
        // Primary sort on downloads + views fallback
        queryConstraints.push(orderBy('downloads', 'desc'));
        queryConstraints.push(orderBy('views', 'desc'));
        break;
      case 'recent':
      default:
        queryConstraints.push(orderBy('createdAt', 'desc'));
        break;
    }

    // 4. Cursor Pagination (startAfter previous DocumentSnapshot)
    if (lastDoc) {
      queryConstraints.push(startAfter(lastDoc));
    }

    // 5. Page Size Limit (fetch +1 to determine hasMore cleanly)
    queryConstraints.push(limit(pageSize + 1));

    const q = query(projectsCol, ...queryConstraints);
    const snapshot = await getDocs(q);

    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;
    const validDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const lastDocSnapshot = validDocs.length > 0 ? validDocs[validDocs.length - 1] : null;

    let pageProjects = validDocs.map(d => ({ id: d.id, ...d.data() } as Project));
    pageProjects = deduplicateProjects(pageProjects);

    // Apply text search, tag & tech filters if present
    if (filters.technology && filters.technology !== 'all') {
      const techLower = filters.technology.toLowerCase();
      pageProjects = pageProjects.filter(p => p.technologies.some(t => t.toLowerCase() === techLower));
    }
    if (filters.tag && filters.tag !== 'all') {
      const tagLower = filters.tag.toLowerCase();
      pageProjects = pageProjects.filter(p => p.tags.some(t => t.toLowerCase() === tagLower));
    }
    if (filters.search && filters.search.trim()) {
      const qText = filters.search.toLowerCase().trim();
      pageProjects = pageProjects.filter(p => 
        p.name.toLowerCase().includes(qText) ||
        p.developerName.toLowerCase().includes(qText) ||
        (p.shortDescription && p.shortDescription.toLowerCase().includes(qText)) ||
        p.description.toLowerCase().includes(qText) ||
        p.technologies.some(t => t.toLowerCase().includes(qText)) ||
        p.tags.some(t => t.toLowerCase().includes(qText))
      );
    }

    updateSyncStatus(navigator.onLine ? 'synced' : 'offline');

    return {
      projects: pageProjects,
      hasMore,
      lastDocSnapshot
    };
  } catch (err: any) {
    updateSyncStatus(navigator.onLine ? 'error' : 'offline');
    console.warn('Firestore getPaginatedProjects network notice, using local cache:', err);
    
    // Graceful fallback to local cache
    const fallbackProjects = getLocalProjects();
    return {
      projects: fallbackProjects.slice(0, pageSize),
      hasMore: fallbackProjects.length > pageSize,
      lastDocSnapshot: null
    };
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'projects', id);
      const snapshot = await getDoc(docRef);
      if (snapshot && snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Project;
      }
    } catch (err) {
      console.warn('Firestore getProjectById notice, using cache:', err);
    }
  }

  const projects = getLocalProjects();
  return projects.find(p => p.id === id) || null;
}

// Helper to generate a clean URL slug from project name
export function generateProjectSlug(name: string, id: string): string {
  const cleanName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const shortId = id.substring(id.length - 6);
  return `${cleanName || 'projet'}-${shortId}`;
}

export async function saveNewProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'downloads' | 'views'>): Promise<Project> {
  const currentAuthUser = auth?.currentUser;
  if (!currentAuthUser && isFirebaseConfigured()) {
    throw new Error('Vous devez être authentifié avec votre compte pour publier un projet.');
  }

  const verifiedOwnerId = currentAuthUser?.uid || projectData.ownerId;
  if (!verifiedOwnerId) {
    throw new Error('Vous devez être authentifié pour publier un projet (UID manquant).');
  }

  const newId = `orax_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const slug = generateProjectSlug(projectData.name, newId);

  const newProject: Project = {
    ...projectData,
    id: newId,
    slug,
    ownerId: verifiedOwnerId, // Strictly identified by Firebase Auth UID
    ownerEmail: currentAuthUser?.email || projectData.ownerEmail || '',
    status: projectData.status || 'published',
    downloads: 0,
    views: 1,
    favoritesCount: 0,
    rating: 0, // All stars start strictly at 0 until user community rates
    ratingsCount: 0,
    ratings: {},
    viewedBy: [verifiedOwnerId],
    downloadedBy: [],
    createdAt: now,
    updatedAt: now,
  };

  // Mark author as having viewed this project locally
  markProjectAsViewedLocally(newId, verifiedOwnerId);

  // 1. Primary Source of Truth: Firestore persistence
  if (db && isFirebaseConfigured()) {
    updateSyncStatus('syncing');
    try {
      await setDoc(doc(db, 'projects', newId), sanitizeForFirestore(newProject));
      updateSyncStatus('synced');
    } catch (err: any) {
      updateSyncStatus('error');
      console.error('Erreur Firestore lors de la création du projet:', err);
      throw new Error(`Échec de publication sur Firestore: ${err?.message || 'Erreur inconnue'}`);
    }
  }

  // 2. Update local cache and broadcast for immediate 0ms UI reactivity
  const projects = getLocalProjects();
  const updatedList = deduplicateProjects([newProject, ...projects]);
  saveLocalProjects(updatedList);
  broadcastProjectsChange(updatedList);

  return newProject;
}

export async function updateExistingProject(id: string, updates: Partial<Project>): Promise<Project> {
  const projects = getLocalProjects();
  const existingProject = projects.find(p => p.id === id);
  const authUser = auth?.currentUser;
  const isAdmin = authUser ? checkIsAdmin({ email: authUser.email || '', uid: authUser.uid }) : false;
  const isOwner = Boolean(authUser && existingProject && existingProject.ownerId === authUser.uid);

  if (authUser && existingProject && !isOwner && !isAdmin) {
    throw new Error('Vous n\'êtes pas autorisé à modifier ce projet (seul le propriétaire UID ou l\'administrateur peut modifier).');
  }

  // Security: Prevent tampering with immutable identifiers
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ownerId: _ignoredOwnerId, createdAt: _ignoredCreatedAt, id: _ignoredId, ...safeUpdates } = updates;

  const now = new Date().toISOString();
  const updatedData: Partial<Project> = { 
    ...safeUpdates, 
    updatedAt: now,
  };

  // 1. Primary Source of Truth: Firestore update
  if (db && isFirebaseConfigured()) {
    updateSyncStatus('syncing');
    try {
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, sanitizeForFirestore(updatedData));
      updateSyncStatus('synced');
    } catch (err: any) {
      updateSyncStatus('error');
      console.error('Erreur Firestore lors de la mise à jour:', err);
      throw new Error(`Échec de la mise à jour Firestore: ${err?.message || 'Erreur inconnue'}`);
    }
  }

  // 2. Update local cache and broadcast
  const index = projects.findIndex(p => p.id === id);
  let updatedProject: Project;
  if (index !== -1) {
    projects[index] = { ...projects[index], ...updatedData };
    const cleanList = deduplicateProjects(projects);
    saveLocalProjects(cleanList);
    broadcastProjectsChange(cleanList);
    updatedProject = projects[index];
  } else {
    updatedProject = { ...existingProject, ...updatedData } as Project;
  }

  return updatedProject;
}

export async function deleteExistingProject(id: string, userId: string): Promise<boolean> {
  const projects = getLocalProjects();
  const project = projects.find(p => p.id === id);
  const authUser = auth?.currentUser;
  const isAdmin = authUser ? checkIsAdmin({ email: authUser.email || '', uid: authUser.uid }) : false;

  // Strict ownership check: Must match authenticated Firebase Auth UID
  const isOwner = Boolean(
    project && 
    project.ownerId && 
    (
      (authUser && project.ownerId === authUser.uid) ||
      project.ownerId === userId
    )
  );

  if (!isOwner && !isAdmin) {
    throw new Error('Vous n\'êtes pas autorisé à supprimer ce projet.');
  }

  // 1. Primary Source of Truth: Firestore deletion
  if (db && isFirebaseConfigured()) {
    updateSyncStatus('syncing');
    try {
      const docRef = doc(db, 'projects', id);
      await deleteDoc(docRef);
      updateSyncStatus('synced');
    } catch (err: any) {
      updateSyncStatus('error');
      console.error('Erreur Firestore lors de la suppression:', err);
      throw new Error(`Échec de la suppression Firestore: ${err?.message || 'Erreur inconnue'}`);
    }
  }

  // 2. Remove from local storage cache & broadcast to UI
  const updated = deduplicateProjects(projects.filter(p => p.id !== id));
  saveLocalProjects(updated);
  broadcastProjectsChange(updated);

  // 3. Remove associated binary file from local IndexedDB asynchronously
  deleteStoredFile(id).catch(() => {});
  if (project?.fileUrl) {
    deleteStoredFile(project.fileUrl).catch(() => {});
  }

  return true;
}

// --------------------------------------------------------------------------
// SECURE UNIQUE VIEW & DOWNLOAD TRACKING PER ACCOUNT / VISITOR
// (Uses Serverless Function + Subcollection verification + Atomic transactions)
// --------------------------------------------------------------------------

const STORAGE_KEY_USER_VIEWS = 'orax_unique_user_views';
const STORAGE_KEY_USER_DOWNLOADS = 'orax_unique_user_downloads';
const STORAGE_KEY_GUEST_ID = 'orax_guest_device_id';

/**
 * Returns a stable identifier for the current user or visitor device
 */
export function getVisitorIdentifier(customUserId?: string): string {
  if (customUserId && customUserId.trim()) {
    return customUserId.trim();
  }
  const authUser = auth?.currentUser;
  if (authUser?.uid) {
    return authUser.uid;
  }
  const session = getCachedSession();
  if (session?.uid) {
    return session.uid;
  }
  try {
    let guestId = localStorage.getItem(STORAGE_KEY_GUEST_ID);
    if (!guestId) {
      guestId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(STORAGE_KEY_GUEST_ID, guestId);
    }
    return guestId;
  } catch {
    return 'visitor_guest';
  }
}

function hasUserViewedProjectLocally(projectId: string, visitorId: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_VIEWS);
    if (raw) {
      const map: Record<string, string[]> = JSON.parse(raw);
      if (map[visitorId] && map[visitorId].includes(projectId)) {
        return true;
      }
    }
  } catch {
    // Ignore parse error
  }
  return false;
}

function markProjectAsViewedLocally(projectId: string, visitorId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_VIEWS);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!map[visitorId]) {
      map[visitorId] = [];
    }
    if (!map[visitorId].includes(projectId)) {
      map[visitorId].push(projectId);
    }
    localStorage.setItem(STORAGE_KEY_USER_VIEWS, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function hasUserDownloadedProjectLocally(projectId: string, visitorId: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_DOWNLOADS);
    if (raw) {
      const map: Record<string, string[]> = JSON.parse(raw);
      if (map[visitorId] && map[visitorId].includes(projectId)) {
        return true;
      }
    }
  } catch {
    // Ignore parse error
  }
  return false;
}

function markProjectAsDownloadedLocally(projectId: string, visitorId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_DOWNLOADS);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!map[visitorId]) {
      map[visitorId] = [];
    }
    if (!map[visitorId].includes(projectId)) {
      map[visitorId].push(projectId);
    }
    localStorage.setItem(STORAGE_KEY_USER_DOWNLOADS, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

// In-memory anti-spam debounce maps
const recentViewCalls = new Map<string, number>();
const recentDownloadCalls = new Map<string, number>();

/**
 * Increments project downloads ONLY ONCE per user account / visitor.
 * Controlled server-side with atomic verification in projects/{projectId}/downloads/{visitorId}.
 */
export async function recordProjectDownload(
  id: string, 
  customUserId?: string
): Promise<{ downloads: number; isNew: boolean }> {
  const visitorId = getVisitorIdentifier(customUserId);
  const debounceKey = `${id}_${visitorId}`;
  const nowMs = Date.now();

  // Rapid click / spam protection: Ignore requests within 2.5 seconds
  if (recentDownloadCalls.has(debounceKey) && nowMs - (recentDownloadCalls.get(debounceKey) || 0) < 2500) {
    const projects = getLocalProjects();
    const current = projects.find(p => p.id === id);
    return { downloads: current?.downloads || 0, isNew: false };
  }
  recentDownloadCalls.set(debounceKey, nowMs);

  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === id);
  const targetProject = index !== -1 ? projects[index] : null;

  // 1. Fast local check to avoid redundant network hits
  if (hasUserDownloadedProjectLocally(id, visitorId)) {
    return {
      downloads: targetProject?.downloads || 0,
      isNew: false,
    };
  }

  // Mark local optimistic cache
  markProjectAsDownloadedLocally(id, visitorId);

  // 2. Try Netlify Serverless Function first for server-authoritative tracking
  try {
    const response = await fetch('/api/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: id,
        type: 'download',
        visitorId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (index !== -1) {
        projects[index].downloads = data.count;
        const clean = deduplicateProjects(projects);
        saveLocalProjects(clean);
        broadcastProjectsChange(clean);
      }
      return { downloads: data.count, isNew: data.isNew };
    }
  } catch {
    // Fallback to direct client-side atomic Firestore transaction if function is unreachable
  }

  // 3. Fallback: Direct Firestore Atomic Transaction using Subcollections
  if (db && isFirebaseConfigured()) {
    try {
      const projectRef = doc(db, 'projects', id);
      const sanitizedVisitorId = visitorId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
      const downloadTrackRef = doc(db, 'projects', id, 'downloads', sanitizedVisitorId);

      const result = await runTransaction(db, async (transaction) => {
        const [projectSnap, trackSnap] = await Promise.all([
          transaction.get(projectRef),
          transaction.get(downloadTrackRef),
        ]);

        if (!projectSnap.exists()) {
          throw new Error('Projet introuvable');
        }

        const projectData = projectSnap.data();
        const currentCount = projectData.downloads || 0;

        if (trackSnap.exists()) {
          return { downloads: currentCount, isNew: false };
        }

        const newCount = currentCount + 1;
        const nowIso = new Date().toISOString();

        transaction.set(downloadTrackRef, {
          visitorId: sanitizedVisitorId,
          createdAt: nowIso,
          type: 'download',
        });

        transaction.update(projectRef, {
          downloads: newCount,
          updatedAt: nowIso,
        });

        return { downloads: newCount, isNew: true };
      });

      if (index !== -1) {
        projects[index].downloads = result.downloads;
        const clean = deduplicateProjects(projects);
        saveLocalProjects(clean);
        broadcastProjectsChange(clean);
      }

      return result;
    } catch (err) {
      console.warn('Firestore direct transaction fallback notice:', err);
    }
  }

  // 4. Offline / Local fallback
  let updatedDownloads = 1;
  if (index !== -1) {
    projects[index].downloads = (projects[index].downloads || 0) + 1;
    updatedDownloads = projects[index].downloads;
    const clean = deduplicateProjects(projects);
    saveLocalProjects(clean);
    broadcastProjectsChange(clean);
  }

  return { downloads: updatedDownloads, isNew: true };
}

/**
 * Increments project views ONLY ONCE per user account / visitor.
 * Controlled server-side with atomic verification in projects/{projectId}/views/{visitorId}.
 */
export async function recordProjectView(
  id: string, 
  customUserId?: string
): Promise<{ views: number; isNew: boolean }> {
  const visitorId = getVisitorIdentifier(customUserId);
  const debounceKey = `${id}_${visitorId}`;
  const nowMs = Date.now();

  // Rapid view / refresh spam protection: Ignore repeat calls within 2.5 seconds
  if (recentViewCalls.has(debounceKey) && nowMs - (recentViewCalls.get(debounceKey) || 0) < 2500) {
    const projects = getLocalProjects();
    const current = projects.find(p => p.id === id);
    return { views: current?.views || 1, isNew: false };
  }
  recentViewCalls.set(debounceKey, nowMs);

  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === id);
  const targetProject = index !== -1 ? projects[index] : null;

  // 1. Fast local check
  if (hasUserViewedProjectLocally(id, visitorId)) {
    return {
      views: targetProject?.views || 1,
      isNew: false,
    };
  }

  // Mark local optimistic cache
  markProjectAsViewedLocally(id, visitorId);

  // 2. Try Netlify Serverless Function first
  try {
    const response = await fetch('/api/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: id,
        type: 'view',
        visitorId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (index !== -1) {
        projects[index].views = data.count;
        const clean = deduplicateProjects(projects);
        saveLocalProjects(clean);
        broadcastProjectsChange(clean);
      }
      return { views: data.count, isNew: data.isNew };
    }
  } catch {
    // Fallback to direct client-side atomic Firestore transaction if function is unreachable
  }

  // 3. Fallback: Direct Firestore Atomic Transaction using Subcollections
  if (db && isFirebaseConfigured()) {
    try {
      const projectRef = doc(db, 'projects', id);
      const sanitizedVisitorId = visitorId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
      const viewTrackRef = doc(db, 'projects', id, 'views', sanitizedVisitorId);

      const result = await runTransaction(db, async (transaction) => {
        const [projectSnap, trackSnap] = await Promise.all([
          transaction.get(projectRef),
          transaction.get(viewTrackRef),
        ]);

        if (!projectSnap.exists()) {
          throw new Error('Projet introuvable');
        }

        const projectData = projectSnap.data();
        const currentCount = projectData.views || 1;

        if (trackSnap.exists()) {
          return { views: currentCount, isNew: false };
        }

        const newCount = currentCount + 1;
        const nowIso = new Date().toISOString();

        transaction.set(viewTrackRef, {
          visitorId: sanitizedVisitorId,
          createdAt: nowIso,
          type: 'view',
        });

        transaction.update(projectRef, {
          views: newCount,
          updatedAt: nowIso,
        });

        return { views: newCount, isNew: true };
      });

      if (index !== -1) {
        projects[index].views = result.views;
        const clean = deduplicateProjects(projects);
        saveLocalProjects(clean);
        broadcastProjectsChange(clean);
      }

      return result;
    } catch (err) {
      console.warn('Firestore direct transaction fallback notice:', err);
    }
  }

  // 4. Offline / Local fallback
  let updatedViews = 1;
  if (index !== -1) {
    projects[index].views = (projects[index].views || 0) + 1;
    updatedViews = projects[index].views;
    const clean = deduplicateProjects(projects);
    saveLocalProjects(clean);
    broadcastProjectsChange(clean);
  }

  return { views: updatedViews, isNew: true };
}

// --------------------------------------------------------------------------
// MODERATION & REPORTS SERVICES
// --------------------------------------------------------------------------

export async function submitProjectReport(
  reportData: Omit<ProjectReport, 'id' | 'createdAt' | 'status'>
): Promise<ProjectReport> {
  const currentAuthUser = auth?.currentUser;
  const verifiedReporterId = currentAuthUser?.uid || reportData.reporterId;
  
  if (!verifiedReporterId) {
    throw new Error('Vous devez être authentifié pour signaler un projet.');
  }

  const newId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newReport: ProjectReport = {
    ...reportData,
    reporterId: verifiedReporterId,
    id: newId,
    status: 'pending',
    createdAt: now,
  };

  const reports = getLocalReports();
  reports.unshift(newReport);
  saveLocalReports(reports);

  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'reports', newId), sanitizeForFirestore(newReport));
    } catch (err) {
      console.warn('Firestore save report warning:', err);
    }
  }

  return newReport;
}

export async function getProjectReports(): Promise<ProjectReport[]> {
  const authUser = auth?.currentUser;
  const isAdmin = authUser ? checkIsAdmin({ email: authUser.email || '', uid: authUser.uid }) : false;

  if (db && isFirebaseConfigured() && (!authUser || isAdmin)) {
    try {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot && !snapshot.empty) {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectReport));
        saveLocalReports(fetched);
        return fetched;
      }
    } catch (err) {
      console.warn('Firestore reports fetch fallback:', err);
    }
  }
  return getLocalReports();
}

export async function updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
  const authUser = auth?.currentUser;
  const isAdmin = authUser ? checkIsAdmin({ email: authUser.email || '', uid: authUser.uid }) : false;

  if (authUser && !isAdmin) {
    throw new Error('Seul l\'administrateur peut modifier le statut d\'un signalement.');
  }

  const reports = getLocalReports();
  const idx = reports.findIndex(r => r.id === reportId);
  if (idx !== -1) {
    reports[idx].status = status;
    reports[idx].updatedAt = new Date().toISOString();
    saveLocalReports(reports);
  }

  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'reports', reportId);
      await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.warn('Firestore report status update error:', err);
    }
  }
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
  await updateExistingProject(projectId, { status });
}

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// RATINGS & REVIEWS SERVICES (Play Store 1 to 5 Stars System)
// --------------------------------------------------------------------------

export interface RatingDistribution {
  total: number;
  average: number;
  counts: { 1: number; 2: number; 3: number; 4: number; 5: number };
  percentages: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

/**
 * Calculates the exact star breakdown (5★ to 1★) identical to Google Play Store
 */
export function getProjectRatingDistribution(project: Project | null | undefined): RatingDistribution {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!project) {
    return {
      total: 0,
      average: 0,
      counts,
      percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const ratingsMap = project.ratings || {};
  const scores = Object.values(ratingsMap);

  if (scores.length > 0) {
    scores.forEach((val) => {
      const rounded = Math.max(1, Math.min(5, Math.round(val))) as 1 | 2 | 3 | 4 | 5;
      counts[rounded] = (counts[rounded] || 0) + 1;
    });
  } else if (project.rating && project.rating > 0 && project.ratingsCount && project.ratingsCount > 0) {
    // If ratings dict wasn't populated but aggregate count exists
    const rounded = Math.max(1, Math.min(5, Math.round(project.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[rounded] = project.ratingsCount;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const sum = (counts[1] * 1) + (counts[2] * 2) + (counts[3] * 3) + (counts[4] * 4) + (counts[5] * 5);
  const average = total > 0 ? parseFloat((sum / total).toFixed(1)) : 0;

  const percentages = {
    5: total > 0 ? Math.round((counts[5] / total) * 100) : 0,
    4: total > 0 ? Math.round((counts[4] / total) * 100) : 0,
    3: total > 0 ? Math.round((counts[3] / total) * 100) : 0,
    2: total > 0 ? Math.round((counts[2] / total) * 100) : 0,
    1: total > 0 ? Math.round((counts[1] / total) * 100) : 0,
  };

  return {
    total,
    average,
    counts,
    percentages,
  };
}

export async function rateProject(
  projectId: string,
  score: number,
  user: UserProfile
): Promise<{ rating: number; ratingsCount: number; userRating: number; distribution: RatingDistribution }> {
  const cleanScore = Math.max(1, Math.min(5, Math.round(score)));
  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === projectId);
  
  if (index === -1) {
    throw new Error('Projet introuvable.');
  }

  const project = { ...projects[index] };
  const currentRatings: Record<string, number> = { ...(project.ratings || {}) };
  currentRatings[user.uid] = cleanScore;

  const totalScores = Object.values(currentRatings);
  const count = totalScores.length;
  const avg = count > 0 ? parseFloat((totalScores.reduce((a, b) => a + b, 0) / count).toFixed(1)) : cleanScore;

  project.rating = avg;
  project.ratingsCount = count;
  project.ratings = currentRatings;
  project.updatedAt = new Date().toISOString();

  // 1. Instant local update & broadcast
  projects[index] = project;
  const clean = deduplicateProjects(projects);
  saveLocalProjects(clean);
  broadcastProjectsChange(clean);

  // 2. Asynchronous Firestore persist
  if (db && isFirebaseConfigured()) {
    const projectRef = doc(db, 'projects', projectId);
    const ratingDocRef = doc(db, 'projects', projectId, 'ratings', user.uid);

    Promise.allSettled([
      setDoc(ratingDocRef, {
        userId: user.uid,
        userDisplayName: user.displayName,
        rating: cleanScore,
        updatedAt: new Date().toISOString(),
      }),
      updateDoc(projectRef, {
        rating: avg,
        ratingsCount: count,
        [`ratings.${user.uid}`]: cleanScore,
        updatedAt: new Date().toISOString(),
      })
    ]).catch(err => console.warn('Firestore rateProject notice:', err));
  }

  const distribution = getProjectRatingDistribution(project);
  return { rating: avg, ratingsCount: count, userRating: cleanScore, distribution };
}

/**
 * Removes a user's rating (Google Play Store style: "Supprimer la note")
 * and recalculates average rating.
 */
export async function deleteProjectRating(
  projectId: string,
  user: UserProfile
): Promise<{ rating: number; ratingsCount: number; distribution: RatingDistribution }> {
  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === projectId);

  if (index === -1) {
    throw new Error('Projet introuvable.');
  }

  const project = { ...projects[index] };
  const currentRatings: Record<string, number> = { ...(project.ratings || {}) };

  delete currentRatings[user.uid];

  const totalScores = Object.values(currentRatings);
  const count = totalScores.length;
  const avg = count > 0 ? parseFloat((totalScores.reduce((a, b) => a + b, 0) / count).toFixed(1)) : 0;

  project.rating = avg;
  project.ratingsCount = count;
  project.ratings = currentRatings;
  project.updatedAt = new Date().toISOString();

  // 1. Instant local cache update
  projects[index] = project;
  const clean = deduplicateProjects(projects);
  saveLocalProjects(clean);
  broadcastProjectsChange(clean);

  // 2. Firestore sync
  if (db && isFirebaseConfigured()) {
    const projectRef = doc(db, 'projects', projectId);
    const ratingDocRef = doc(db, 'projects', projectId, 'ratings', user.uid);

    Promise.allSettled([
      deleteDoc(ratingDocRef),
      updateDoc(projectRef, {
        rating: avg,
        ratingsCount: count,
        ratings: currentRatings,
        updatedAt: new Date().toISOString(),
      })
    ]).catch(err => console.warn('Firestore deleteProjectRating notice:', err));
  }

  const distribution = getProjectRatingDistribution(project);
  return { rating: avg, ratingsCount: count, distribution };
}

// --------------------------------------------------------------------------
// COMMENTS SERVICES
// --------------------------------------------------------------------------

const COMMENTS_CACHE_PREFIX = 'orax_comments_';

export function getLocalComments(projectId: string): ProjectComment[] {
  try {
    const raw = localStorage.getItem(`${COMMENTS_CACHE_PREFIX}${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalComments(projectId: string, comments: ProjectComment[]): void {
  try {
    localStorage.setItem(`${COMMENTS_CACHE_PREFIX}${projectId}`, JSON.stringify(comments));
  } catch {}
}

export async function getProjectComments(projectId: string): Promise<ProjectComment[]> {
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(
        collection(db, 'projects', projectId, 'comments'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      if (snapshot && !snapshot.empty) {
        const comments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectComment));
        saveLocalComments(projectId, comments);
        return comments;
      }
    } catch (err) {
      console.warn('Firestore comments fetch notice:', err);
    }
  }
  return getLocalComments(projectId);
}

export function subscribeToProjectComments(
  projectId: string,
  callback: (comments: ProjectComment[]) => void
): () => void {
  // Call immediately with local cache
  callback(getLocalComments(projectId));

  if (!db || !isFirebaseConfigured()) {
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'projects', projectId, 'comments'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const comments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectComment));
        saveLocalComments(projectId, comments);
        callback(comments);
      },
      (err) => {
        console.warn('Firestore comments onSnapshot notice:', err);
        callback(getLocalComments(projectId));
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

export async function addProjectComment(
  projectId: string,
  content: string,
  user: UserProfile,
  rating?: number
): Promise<ProjectComment> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    throw new Error('Le commentaire ne peut pas être vide.');
  }

  const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const isLordDemon = user.displayName.toUpperCase().includes('LORD DEMON') || user.uid === 'dev_lord_demon';

  const newComment: ProjectComment = {
    id: commentId,
    projectId,
    userId: user.uid,
    userDisplayName: user.displayName || 'Utilisateur ORAX',
    userPhotoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.displayName)}`,
    userIsLordDemon: isLordDemon,
    rating: rating ? Math.max(1, Math.min(5, Math.round(rating))) : undefined,
    content: cleanContent,
    createdAt: now,
  };

  // 1. Instant local update
  const localComments = getLocalComments(projectId);
  const updatedComments = [newComment, ...localComments.filter(c => c.id !== commentId)];
  saveLocalComments(projectId, updatedComments);

  // If rating provided, update project rating too
  if (rating) {
    rateProject(projectId, rating, user).catch(() => {});
  }

  // 2. Asynchronous Firestore persist
  if (db && isFirebaseConfigured()) {
    const commentDocRef = doc(db, 'projects', projectId, 'comments', commentId);
    setDoc(commentDocRef, sanitizeForFirestore(newComment)).catch(err => {
      console.warn('Firestore add comment non-blocking notice:', err);
    });
  }

  return newComment;
}

export async function editProjectComment(
  commentId: string,
  projectId: string,
  content: string,
  rating: number | undefined,
  user: UserProfile
): Promise<ProjectComment> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    throw new Error('Le commentaire ne peut pas être vide.');
  }

  const localComments = getLocalComments(projectId);
  const idx = localComments.findIndex(c => c.id === commentId);
  if (idx === -1) {
    throw new Error('Commentaire introuvable.');
  }

  const existing = localComments[idx];
  if (existing.userId !== user.uid && !user.isAdmin) {
    throw new Error('Vous n\'êtes pas autorisé à modifier ce commentaire.');
  }

  const cleanRating = rating ? Math.max(1, Math.min(5, Math.round(rating))) : undefined;
  const updatedComment: ProjectComment = {
    ...existing,
    content: cleanContent,
    rating: cleanRating,
    updatedAt: new Date().toISOString(),
  };

  localComments[idx] = updatedComment;
  saveLocalComments(projectId, localComments);

  // If rating changed, update project rating as well
  if (cleanRating) {
    rateProject(projectId, cleanRating, user).catch(() => {});
  }

  if (db && isFirebaseConfigured()) {
    const commentDocRef = doc(db, 'projects', projectId, 'comments', commentId);
    setDoc(commentDocRef, sanitizeForFirestore(updatedComment), { merge: true }).catch(err => {
      console.warn('Firestore edit comment notice:', err);
    });
  }

  return updatedComment;
}

export async function toggleCommentHelpful(
  commentId: string,
  projectId: string,
  user: UserProfile
): Promise<{ helpfulCount: number; isHelpful: boolean }> {
  const localComments = getLocalComments(projectId);
  const idx = localComments.findIndex(c => c.id === commentId);
  if (idx === -1) {
    throw new Error('Commentaire introuvable.');
  }

  const comment = { ...localComments[idx] };
  const helpfulUsers = Array.from(new Set(comment.helpfulUsers || []));
  const userIdx = helpfulUsers.indexOf(user.uid);
  const isHelpful = userIdx === -1;

  if (isHelpful) {
    helpfulUsers.push(user.uid);
  } else {
    helpfulUsers.splice(userIdx, 1);
  }

  comment.helpfulUsers = helpfulUsers;
  comment.helpfulCount = helpfulUsers.length;
  localComments[idx] = comment;
  saveLocalComments(projectId, localComments);

  if (db && isFirebaseConfigured()) {
    const commentDocRef = doc(db, 'projects', projectId, 'comments', commentId);
    updateDoc(commentDocRef, {
      helpfulUsers,
      helpfulCount: helpfulUsers.length,
    }).catch(err => {
      console.warn('Firestore toggle comment helpful notice:', err);
    });
  }

  return { helpfulCount: comment.helpfulCount, isHelpful };
}

export async function replyToProjectComment(
  commentId: string,
  projectId: string,
  replyContent: string,
  developerUser: UserProfile
): Promise<ProjectComment> {
  const cleanReply = replyContent.trim();
  if (!cleanReply) {
    throw new Error('La réponse ne peut pas être vide.');
  }

  const localComments = getLocalComments(projectId);
  const idx = localComments.findIndex(c => c.id === commentId);
  if (idx === -1) {
    throw new Error('Commentaire introuvable.');
  }

  const comment = { ...localComments[idx] };
  comment.developerReply = {
    content: cleanReply,
    createdAt: new Date().toISOString(),
    developerName: developerUser.displayName || 'Développeur',
    developerPhotoURL: developerUser.photoURL,
  };

  localComments[idx] = comment;
  saveLocalComments(projectId, localComments);

  if (db && isFirebaseConfigured()) {
    const commentDocRef = doc(db, 'projects', projectId, 'comments', commentId);
    updateDoc(commentDocRef, {
      developerReply: sanitizeForFirestore(comment.developerReply),
    }).catch(err => {
      console.warn('Firestore developer reply notice:', err);
    });
  }

  return comment;
}

export async function deleteProjectComment(
  commentId: string,
  projectId: string,
  _userId: string,
  _isAdmin?: boolean
): Promise<boolean> {
  // 1. Instant local update
  const localComments = getLocalComments(projectId);
  const filtered = localComments.filter(c => c.id !== commentId);
  saveLocalComments(projectId, filtered);

  // 2. Asynchronous Firestore deletion
  if (db && isFirebaseConfigured()) {
    const commentDocRef = doc(db, 'projects', projectId, 'comments', commentId);
    deleteDoc(commentDocRef).catch(err => {
      console.warn('Firestore delete comment notice:', err);
    });
  }

  return true;
}

// --------------------------------------------------------------------------
// DEVELOPER FOLLOW SYSTEM
// --------------------------------------------------------------------------

const FOLLOWING_CACHE_KEY = 'orax_following_devs';

export function getLocalFollowing(): string[] {
  try {
    const raw = localStorage.getItem(FOLLOWING_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalFollowing(following: string[]): void {
  try {
    localStorage.setItem(FOLLOWING_CACHE_KEY, JSON.stringify(Array.from(new Set(following))));
  } catch {}
}

export function isFollowingDeveloper(developerIdentifier: string, user: UserProfile | null): boolean {
  if (!developerIdentifier) return false;
  const cleanId = developerIdentifier.trim().toLowerCase();
  
  if (user?.following && user.following.some(f => f.trim().toLowerCase() === cleanId)) {
    return true;
  }
  
  const localFollowing = getLocalFollowing();
  return localFollowing.some(f => f.trim().toLowerCase() === cleanId);
}

export async function toggleFollowDeveloper(
  developerIdentifier: string,
  user: UserProfile
): Promise<{ isFollowing: boolean; followingList: string[] }> {
  if (!developerIdentifier || !user) {
    throw new Error('Identifiant ou utilisateur invalide.');
  }

  const cleanTarget = developerIdentifier.trim();
  const currentList = Array.from(new Set(user.following || getLocalFollowing()));
  const targetLower = cleanTarget.toLowerCase();

  const isCurrentlyFollowing = currentList.some(f => f.toLowerCase() === targetLower);
  let updatedList: string[];

  if (isCurrentlyFollowing) {
    updatedList = currentList.filter(f => f.toLowerCase() !== targetLower);
  } else {
    updatedList = [...currentList, cleanTarget];
  }

  // Update local cache & current user session
  saveLocalFollowing(updatedList);
  const updatedUser: UserProfile = { ...user, following: updatedList };
  saveCachedSession(updatedUser);

  // Sync to Firestore in background
  if (db && isFirebaseConfigured() && user.uid) {
    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, { following: updatedList, updatedAt: new Date().toISOString() })
      .catch(err => console.warn('Firestore follow update notice:', err));
  }

  return { isFollowing: !isCurrentlyFollowing, followingList: updatedList };
}

// --------------------------------------------------------------------------
// FAVORITES (PROJETS FAVORIS) SYSTEM
// --------------------------------------------------------------------------

const FAVORITES_CACHE_KEY = 'orax_user_favorites';

export function getLocalFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalFavorites(favorites: string[]): void {
  try {
    localStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(favorites));
  } catch {}
}

export function isProjectFavorited(projectId: string, user?: UserProfile | null): boolean {
  if (!projectId) return false;
  if (user?.favorites && user.favorites.includes(projectId)) {
    return true;
  }
  const local = getLocalFavorites();
  return local.includes(projectId);
}

export async function toggleFavoriteProject(
  projectId: string,
  user: UserProfile
): Promise<{ isFavorited: boolean; favorites: string[] }> {
  if (!projectId || !user) {
    throw new Error('Projet ou utilisateur invalide.');
  }

  const currentList = Array.from(new Set(user.favorites || getLocalFavorites()));
  const isCurrentlyFav = currentList.includes(projectId);
  let updatedList: string[];

  if (isCurrentlyFav) {
    updatedList = currentList.filter(id => id !== projectId);
  } else {
    updatedList = [...currentList, projectId];
  }

  // Update local storage and cached session
  saveLocalFavorites(updatedList);
  const updatedUser: UserProfile = { ...user, favorites: updatedList };
  saveCachedSession(updatedUser);

  // Update project favoritesCount locally & broadcast
  const localProjects = getLocalProjects();
  const projIndex = localProjects.findIndex(p => p.id === projectId);
  if (projIndex !== -1) {
    const currentFavCount = localProjects[projIndex].favoritesCount || 0;
    localProjects[projIndex].favoritesCount = Math.max(0, currentFavCount + (isCurrentlyFav ? -1 : 1));
    saveLocalProjects(localProjects);
    broadcastProjectsChange(localProjects);
  }

  // Sync to Firestore in background
  if (db && isFirebaseConfigured()) {
    if (user.uid) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { favorites: updatedList, updatedAt: new Date().toISOString() })
        .catch(err => console.warn('Firestore favorites update notice:', err));
    }
    const projectRef = doc(db, 'projects', projectId);
    updateDoc(projectRef, {
      favoritesCount: increment(isCurrentlyFav ? -1 : 1),
    }).catch(err => console.warn('Firestore project favoritesCount update notice:', err));
  }

  return { isFavorited: !isCurrentlyFav, favorites: updatedList };
}

// --------------------------------------------------------------------------
// DEVELOPERS LEADERBOARD & RANKINGS
// --------------------------------------------------------------------------

export function getDevelopersLeaderboard(allProjects: Project[]): DeveloperInfo[] {
  const devMap: Record<string, { name: string; isLord: boolean; projects: Project[] }> = {};

  allProjects.forEach(project => {
    const name = project.developerName.trim();
    const isLord = name.toUpperCase().includes('LORD DEMON') || project.ownerId === 'dev_lord_demon';
    const key = isLord ? 'LORD DEMON' : name.toLowerCase();

    if (!devMap[key]) {
      devMap[key] = {
        name: isLord ? 'LORD DEMON' : name,
        isLord,
        projects: [],
      };
    }
    devMap[key].projects.push(project);
  });

  // Convert map to DeveloperInfo array
  const leaderboard = Object.values(devMap).map(devGroup => {
    const totalDownloads = devGroup.projects.reduce((sum, p) => sum + (p.downloads || 0), 0);
    const totalViews = devGroup.projects.reduce((sum, p) => sum + (p.views || 0), 0);

    let totalScore = 0;
    let totalRatingsCount = 0;
    devGroup.projects.forEach(p => {
      if (p.rating && p.ratingsCount) {
        totalScore += p.rating * p.ratingsCount;
        totalRatingsCount += p.ratingsCount;
      } else if (p.rating && p.rating > 0) {
        totalScore += p.rating;
        totalRatingsCount += 1;
      }
    });

    const avgRating = totalRatingsCount > 0
      ? parseFloat((totalScore / totalRatingsCount).toFixed(1))
      : 0;

    return {
      id: devGroup.projects[0]?.ownerId || devGroup.name,
      name: devGroup.name,
      role: devGroup.isLord ? 'Fondateur & Développeur' : 'Développeur',
      photoURL: devGroup.isLord
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'
        : (devGroup.projects[0]?.thumbnail || undefined),
      bio: devGroup.isLord ? 'Créateur et fondateur de l\'écosystème ORAX PROJET.' : undefined,
      projectsCount: devGroup.projects.length,
      totalDownloads,
      totalViews,
      rating: avgRating,
      ratingsCount: totalRatingsCount,
      followersCount: devGroup.isLord ? 142 : Math.max(1, devGroup.projects.length * 3),
      isLordDemon: devGroup.isLord,
      projects: devGroup.projects,
    };
  });

  // Sort by total downloads descending
  leaderboard.sort((a, b) => {
    if (a.isLordDemon && !b.isLordDemon) return -1;
    if (!a.isLordDemon && b.isLordDemon) return 1;
    return b.totalDownloads - a.totalDownloads;
  });

  return leaderboard;
}

// --------------------------------------------------------------------------
// DEVELOPER INFO & PROFILES COMPUTATION
// --------------------------------------------------------------------------

export function getDeveloperInfo(
  developerIdentifier: string,
  allProjects: Project[]
): DeveloperInfo {
  const target = developerIdentifier.trim();
  const targetLower = target.toLowerCase();

  // Match by developerName OR ownerId
  const devProjects = allProjects.filter(p => 
    p.developerName.toLowerCase() === targetLower || 
    p.ownerId === target ||
    (targetLower.includes('lord demon') && p.developerName.toUpperCase().includes('LORD DEMON'))
  );

  const isLordDemon = targetLower.includes('lord demon') || target === 'dev_lord_demon';
  const name = isLordDemon ? 'LORD DEMON' : (devProjects[0]?.developerName || target);
  const role = isLordDemon ? 'Fondateur & Développeur' : 'Développeur';

  const totalDownloads = devProjects.reduce((sum, p) => sum + (p.downloads || 0), 0);
  const totalViews = devProjects.reduce((sum, p) => sum + (p.views || 0), 0);

  let totalRatingScore = 0;
  let totalRatingsCount = 0;

  devProjects.forEach(p => {
    if (p.rating && p.ratingsCount) {
      totalRatingScore += p.rating * p.ratingsCount;
      totalRatingsCount += p.ratingsCount;
    } else if (p.rating && p.rating > 0) {
      totalRatingScore += p.rating;
      totalRatingsCount += 1;
    }
  });

  const avgRating = totalRatingsCount > 0 
    ? parseFloat((totalRatingScore / totalRatingsCount).toFixed(1)) 
    : 0;

  const fallbackRatingsCount = totalRatingsCount;

  return {
    id: devProjects[0]?.ownerId || target,
    name,
    role,
    photoURL: isLordDemon 
      ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'
      : (devProjects[0]?.thumbnail || undefined),
    bio: isLordDemon ? 'Créateur et développeur de l\'écosystème ORAX PROJET.' : undefined,
    projectsCount: devProjects.length,
    totalDownloads,
    totalViews,
    rating: avgRating,
    ratingsCount: fallbackRatingsCount,
    followersCount: isLordDemon ? 142 : Math.max(1, devProjects.length * 3),
    isLordDemon,
    projects: devProjects,
  };
}

