import React from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  onOpenAddFolder: () => void;
  showSampleData: boolean;
  onToggleSampleData: () => void;
  onRefresh: () => void;
  activeTabTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onClearSearch,
  onOpenAddFolder,
  showSampleData,
  onToggleSampleData,
  onRefresh,
  activeTabTitle,
}) => {
  return (
    <header className="h-16 px-6 bg-dark-900/80 backdrop-blur-md border-b border-dark-800/80 flex items-center justify-between gap-4 select-none z-10 shrink-0">
      {/* Left Navigation Buttons & View Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <button
            className="w-8 h-8 rounded-lg bg-dark-800/60 hover:bg-dark-750 text-dark-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-dark-800/60"
            title="Go Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            className="w-8 h-8 rounded-lg bg-dark-800/60 hover:bg-dark-750 text-dark-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
            title="Go Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden sm:block">
          <span className="text-xs font-semibold uppercase tracking-wider text-dark-400">
            Current View
          </span>
          <h1 className="text-sm font-bold text-white capitalize leading-none mt-0.5">
            {activeTabTitle}
          </h1>
        </div>
      </div>

      {/* Central Search Bar */}
      <div className="flex-1 max-w-xl relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-dark-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tracks, artists, albums, or playlists... (Ctrl+K)"
            className="w-full h-10 pl-10 pr-24 bg-dark-850/90 border border-dark-750 rounded-xl text-xs text-white placeholder-dark-400 focus:outline-none focus:border-aura-500 focus:ring-1 focus:ring-aura-500 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={onClearSearch}
              className="absolute right-3 p-1 rounded hover:bg-dark-750 text-dark-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-3 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-dark-400 bg-dark-800 border border-dark-700 rounded">
                Ctrl
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-dark-400 bg-dark-800 border border-dark-700 rounded">
                K
              </kbd>
            </div>
          )}
        </div>
      </div>

      {/* Right Action Tools & Demo Switcher */}
      <div className="flex items-center gap-3">
        {/* Toggle between Empty State & Mock Data for testing Phase 1 UI */}
        <button
          onClick={onToggleSampleData}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            showSampleData
              ? 'bg-aura-500/10 text-aura-300 border-aura-500/30'
              : 'bg-dark-850 text-dark-300 border-dark-750 hover:text-white'
          }`}
          title="Toggle Empty State vs Preview Tracks"
        >
          {showSampleData ? (
            <ToggleRight className="w-4 h-4 text-aura-400" />
          ) : (
            <ToggleLeft className="w-4 h-4 text-dark-400" />
          )}
          <span className="hidden md:inline">
            {showSampleData ? 'Preview Mode' : 'Empty Library'}
          </span>
        </button>

        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-dark-850 hover:bg-dark-750 text-dark-300 hover:text-white border border-dark-750 transition-colors"
          title="Refresh Library"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenAddFolder}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-aura-600 to-indigo-600 hover:from-aura-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow transition-all"
        >
          <FolderPlus className="w-4 h-4" />
          <span className="hidden lg:inline">Add Music Folder</span>
        </button>
      </div>
    </header>
  );
};
