export type ProjectCategory = 
  | 'web'
  | 'mobile'
  | 'bot'
  | 'software'
  | 'game'
  | 'ai'
  | 'security'
  | 'script'
  | 'other';

export type ProjectStatus = 'published' | 'pending' | 'hidden' | 'rejected';

export interface Project {
  id: string;
  name: string;
  slug?: string;
  description: string;
  shortDescription?: string;
  developerName: string;
  ownerId: string;
  ownerEmail?: string;
  category: ProjectCategory;
  technologies: string[];
  tags: string[];
  fileUrl: string;
  fileName: string;
  fileSize: number; // in bytes
  fileFormat?: string;
  cloudinaryPublicId?: string;
  thumbnail: string;
  downloads: number;
  views: number;
  favoritesCount?: number;
  viewedBy?: string[];
  downloadedBy?: string[];
  rating?: number; // average rating 1 to 5 (0 if unrated)
  ratingsCount?: number; // total number of ratings
  ratings?: Record<string, number>; // userId -> rating value (1 to 5)
  featured?: boolean;
  status?: ProjectStatus;
  demoUrl?: string;
  githubUrl?: string;
  version?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface ProjectComment {
  id: string;
  projectId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  userIsLordDemon?: boolean;
  rating?: number; // 1 to 5 stars if rated during comment
  content: string;
  createdAt: string; // ISO date string
  updatedAt?: string;
  helpfulCount?: number;
  helpfulUsers?: string[];
  developerReply?: {
    content: string;
    createdAt: string;
    developerName: string;
    developerPhotoURL?: string;
  };
}

export interface DeveloperInfo {
  id: string;
  name: string;
  role: string;
  photoURL?: string;
  bio?: string;
  projectsCount: number;
  totalDownloads: number;
  totalViews: number;
  rating: number;
  ratingsCount: number;
  followersCount: number;
  isLordDemon: boolean;
  projects: Project[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  bio?: string;
  github?: string;
  website?: string;
  totalDownloads?: number;
  projectsCount?: number;
  following?: string[]; // Array of followed developer identifiers (names or ownerIds)
  favorites?: string[]; // Array of favorited project IDs
  followersCount?: number;
  isAdmin?: boolean;
}

export type SortOption = 'recent' | 'oldest' | 'downloads' | 'popular' | 'alpha';

export interface FilterOptions {
  search: string;
  category: ProjectCategory | 'all';
  technology: string | 'all';
  tag: string | 'all';
  sortBy: SortOption;
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  originalFilename: string;
}

export interface CategoryMetadata {
  id: ProjectCategory;
  name: string;
  icon: string;
  description: string;
  color: string;
  badgeBg: string;
  borderColor: string;
}

export type ReportReason = 
  | 'malicious' 
  | 'spam' 
  | 'stolen' 
  | 'inappropriate' 
  | 'dangerous' 
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

export type CloudSyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface PaginatedProjectsResult {
  projects: Project[];
  hasMore: boolean;
  lastDocSnapshot: any | null;
  totalEstimate?: number;
}

export interface ProjectReport {
  id: string;
  projectId: string;
  projectName: string;
  reporterId: string;
  reporterEmail?: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt?: string;
}
