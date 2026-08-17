import React from 'react';
import { 
  Globe, 
  Smartphone, 
  Bot, 
  Laptop, 
  Brain, 
  Shield, 
  Gamepad2, 
  Terminal, 
  Package, 
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { Project, ProjectCategory } from '../types';
import { CATEGORIES } from '../data/categories';
import { motion } from 'motion/react';

interface CategoriesViewProps {
  projects: Project[];
  onSelectCategory: (category: ProjectCategory) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  projects,
  onSelectCategory,
}) => {
  const getIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'Globe': return <Globe className={className} />;
      case 'Smartphone': return <Smartphone className={className} />;
      case 'Bot': return <Bot className={className} />;
      case 'Laptop': return <Laptop className={className} />;
      case 'Brain': return <Brain className={className} />;
      case 'Shield': return <Shield className={className} />;
      case 'Gamepad2': return <Gamepad2 className={className} />;
      case 'Terminal': return <Terminal className={className} />;
      default: return <Package className={className} />;
    }
  };

  const getCategoryProjectCount = (catId: ProjectCategory) => {
    return projects.filter(p => p.category === catId).length;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
          <Layers className="w-3.5 h-3.5" />
          <span>Architecture & Écosystème Tech</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
          Catégories de Projets
        </h1>
        <p className="text-sm text-zinc-400">
          Explorez les codes sources, bots, applications et outils logiciels classés par domaine d'ingénierie.
        </p>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 pt-4">
        {CATEGORIES.map((cat, idx) => {
          const count = getCategoryProjectCount(cat.id);
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              id={`category-card-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              className="group relative p-6 rounded-3xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-cyan-500/50 shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 ${cat.badgeBg}`}>
                    {getIcon(cat.icon, `w-6 h-6 ${cat.color}`)}
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-950 border border-zinc-800 text-zinc-400">
                    {count} projet{count > 1 ? 's' : ''}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors font-mono">
                  {cat.name}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-semibold text-zinc-400 group-hover:text-cyan-400">
                <span>Explorer cette catégorie</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
};
