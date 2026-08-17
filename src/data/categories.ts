import { CategoryMetadata, ProjectCategory } from '../types';

export const CATEGORIES: CategoryMetadata[] = [
  {
    id: 'web',
    name: 'Sites web',
    icon: 'Globe',
    description: 'Applications web complètes, frontends modernes, dashboards et APIs',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    borderColor: 'hover:border-cyan-500/40',
  },
  {
    id: 'mobile',
    name: 'Applications mobiles',
    icon: 'Smartphone',
    description: 'Apps iOS & Android développées en Flutter, React Native, Swift ou Kotlin',
    color: 'text-violet-400',
    badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    borderColor: 'hover:border-violet-500/40',
  },
  {
    id: 'bot',
    name: 'Bots & Automatisation',
    icon: 'Bot',
    description: 'Bots Telegram, Discord, WhatsApp, scrapers et crawlers automatiques',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderColor: 'hover:border-emerald-500/40',
  },
  {
    id: 'software',
    name: 'Logiciels & Desktop',
    icon: 'Laptop',
    description: 'Programmes exécutables Windows, macOS, Linux (Electron, C++, Rust, C#)',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    borderColor: 'hover:border-blue-500/40',
  },
  {
    id: 'ai',
    name: 'Intelligence Artificielle',
    icon: 'Brain',
    description: 'Modèles LLM, agents intelligents, vision par ordinateur, scripts Python IA',
    color: 'text-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    borderColor: 'hover:border-fuchsia-500/40',
  },
  {
    id: 'security',
    name: 'Cybersécurité',
    icon: 'Shield',
    description: 'Outils de pentesting, audits de sécurité, analyseurs réseau et scanners',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    borderColor: 'hover:border-rose-500/40',
  },
  {
    id: 'game',
    name: 'Jeux vidéo',
    icon: 'Gamepad2',
    description: 'Jeux 2D/3D créés sous Unity, Godot, Unreal Engine ou JavaScript Canvas',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderColor: 'hover:border-amber-500/40',
  },
  {
    id: 'script',
    name: 'Scripts & Utilitaires',
    icon: 'Terminal',
    description: 'Scripts Bash, Python, Node.js, automatisations DevOps et outils système',
    color: 'text-lime-400',
    badgeBg: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
    borderColor: 'hover:border-lime-500/40',
  },
  {
    id: 'other',
    name: 'Autres ressources',
    icon: 'Package',
    description: 'Templates, bibliothèques, architectures, plugins et frameworks custom',
    color: 'text-zinc-400',
    badgeBg: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    borderColor: 'hover:border-zinc-500/40',
  },
];

export const POPULAR_TECHNOLOGIES = [
  'React',
  'Node.js',
  'Python',
  'TypeScript',
  'Flutter',
  'Telegram API',
  'Discord.js',
  'Cloud Database',
  'Next.js',
  'Tailwind CSS',
  'Docker',
  'C++',
  'Rust',
  'FastAPI',
  'Unity',
  'Linux',
];

export function getCategoryById(id: ProjectCategory): CategoryMetadata {
  const found = CATEGORIES.find(c => c.id === id);
  return found || CATEGORIES[CATEGORIES.length - 1];
}
