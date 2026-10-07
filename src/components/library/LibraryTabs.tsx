import React from 'react';
import {
  Disc3,
  Users,
  Music,
  History,
  LayoutList,
  LayoutGrid,
  AlignJustify,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { TabType, ViewMode, SortField, SortOrder } from '../../types';

interface LibraryTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortOrder: SortOrder;
  onToggleSortOrder: () => void;
  totalTracks: number;
  totalAlbums: number;
  totalArtists: number;
}

export const LibraryTabs: React.FC<LibraryTabsProps> = ({
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onToggleSortOrder,
  totalTracks,
  totalAlbums,
  totalArtists,
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'albums', label: 'Albums', icon: <Disc3 className="w-3.5 h-3.5" />, count: totalAlbums },
    { id: 'artists', label: 'Artists', icon: <Users className="w-3.5 h-3.5" />, count: totalArtists },
    { id: 'all-tracks', label: 'Tracks', icon: <Music className="w-3.5 h-3.5" />, count: totalTracks },
    { id: 'recently-played', label: 'Recently Played', icon: <History className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 pt-5 pb-3 border-b border-dark-800/80 bg-dark-900/30 select-none">
      {/* Tab Pills */}
      <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-aura-600 text-white shadow-glow'
                  : 'bg-dark-850/70 hover:bg-dark-800 text-dark-300 hover:text-white border border-dark-800'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-dark-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-dark-800 text-dark-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* View Mode & Sort Controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {/* Sort Selector */}
        <div className="flex items-center gap-1 bg-dark-850 border border-dark-800 rounded-xl px-2.5 py-1.5 text-xs text-dark-300">
          <Filter className="w-3.5 h-3.5 text-dark-400 mr-1" />
          <span className="text-dark-400 text-[11px] font-medium hidden md:inline">Sort:</span>
          <select
            value={sortField}
            onChange={(e) => onSortFieldChange(e.target.value as SortField)}
            className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
          >
            <option value="title" className="bg-dark-850 text-white">Title</option>
            <option value="artist" className="bg-dark-850 text-white">Artist</option>
            <option value="album" className="bg-dark-850 text-white">Album</option>
            <option value="duration" className="bg-dark-850 text-white">Duration</option>
            <option value="dateAdded" className="bg-dark-850 text-white">Date Added</option>
          </select>
          <button
            onClick={onToggleSortOrder}
            className="p-1 hover:bg-dark-750 text-dark-300 hover:text-white rounded transition-colors ml-1"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className={`w-3.5 h-3.5 ${sortOrder === 'desc' ? 'text-aura-400' : ''}`} />
          </button>
        </div>

        {/* View Mode Toggles */}
        <div className="flex items-center bg-dark-850 border border-dark-800 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              viewMode === 'list'
                ? 'bg-aura-600/80 text-white shadow-sm'
                : 'text-dark-400 hover:text-white'
            }`}
            title="Standard List View"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              viewMode === 'grid'
                ? 'bg-aura-600/80 text-white shadow-sm'
                : 'text-dark-400 hover:text-white'
            }`}
            title="Album Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('compact')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              viewMode === 'compact'
                ? 'bg-aura-600/80 text-white shadow-sm'
                : 'text-dark-400 hover:text-white'
            }`}
            title="Compact Table View"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
