import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  ArrowUpDown, 
  Search, 
  X, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Flame,
  LayoutGrid
} from 'lucide-react';
import { FilterOptions, ProjectCategory, SortOption } from '../types';
import { CATEGORIES, POPULAR_TECHNOLOGIES } from '../data/categories';

interface FilterBarProps {
  filters: FilterOptions;
  onChange: (newFilters: FilterOptions) => void;
  totalResults: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  totalResults,
}) => {
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sync external search updates to local state
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounce search update to parent state to avoid re-rendering heavy lists on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onChange({ ...filters, search: localSearch });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [localSearch, filters, onChange]);

  const handleCategoryChange = (category: ProjectCategory | 'all') => {
    onChange({ ...filters, category });
  };

  const handleSortChange = (sortBy: SortOption) => {
    onChange({ ...filters, sortBy });
  };

  const handleTechChange = (tech: string) => {
    const nextTech = filters.technology === tech ? 'all' : tech;
    onChange({ ...filters, technology: nextTech });
  };

  const clearAllFilters = () => {
    setLocalSearch('');
    onChange({
      search: '',
      category: 'all',
      technology: 'all',
      tag: 'all',
      sortBy: 'recent',
    });
  };

  const hasActiveFilters = 
    filters.search !== '' || 
    localSearch !== '' ||
    filters.category !== 'all' || 
    filters.technology !== 'all' || 
    filters.tag !== 'all' ||
    filters.sortBy !== 'recent';

  return (
    <div className="space-y-4 w-full">
      {/* Top row: Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/90 p-3 sm:p-4 rounded-2xl border border-zinc-800/80 shadow-md">
        
        {/* Search inside filter */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            id="filter-search-input"
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Rechercher par nom, techno, dev, tag..."
            className="w-full bg-zinc-950 text-sm text-white placeholder-zinc-500 pl-10 pr-9 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
          {localSearch && (
            <button
              id="clear-search-btn"
              onClick={() => {
                setLocalSearch('');
                onChange({ ...filters, search: '' });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
              title="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 rounded-xl border border-zinc-800 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-zinc-400 hidden xs:inline">Trier :</span>
            <select
              id="sort-select-dropdown"
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="recent" className="bg-zinc-900 text-white">Plus récents 🆕</option>
              <option value="downloads" className="bg-zinc-900 text-white">Plus téléchargés ⬇️</option>
              <option value="popular" className="bg-zinc-900 text-white">Plus populaires 🔥</option>
              <option value="oldest" className="bg-zinc-900 text-white">Plus anciens 📅</option>
              <option value="alpha" className="bg-zinc-900 text-white">Ordre alphabétique (A-Z) 🔤</option>
            </select>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              id="clear-filters-btn"
              onClick={clearAllFilters}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition-colors flex items-center gap-1 shrink-0"
              title="Réinitialiser tous les filtres"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Effacer filtres</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
        <button
          id="cat-pill-all"
          onClick={() => handleCategoryChange('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            filters.category === 'all'
              ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tous les projets</span>
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            id={`cat-pill-${cat.id}`}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
              filters.category === cat.id
                ? 'bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800/80 hover:border-zinc-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Popular Technologies Filter tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-zinc-500 font-mono text-[11px] shrink-0 mr-1">Technologies :</span>
        {POPULAR_TECHNOLOGIES.slice(0, 10).map((tech) => {
          const isSelected = filters.technology.toLowerCase() === tech.toLowerCase();
          return (
            <button
              key={tech}
              onClick={() => handleTechChange(tech)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all shrink-0 border ${
                isSelected
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              #{tech}
            </button>
          );
        })}
      </div>

      {/* Results summary row */}
      <div className="flex items-center justify-between text-xs text-zinc-400 font-mono px-1">
        <span>
          <strong className="text-white font-bold">{totalResults}</strong> projet{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
        </span>
        {filters.category !== 'all' && (
          <span className="text-cyan-400">
            Filtre actif : {CATEGORIES.find(c => c.id === filters.category)?.name}
          </span>
        )}
      </div>
    </div>
  );
};
