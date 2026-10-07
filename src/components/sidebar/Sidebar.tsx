import React from 'react';
import {
  Home,
  Search,
  Music,
  Heart,
  ListMusic,
  Cable,
  Plus,
  Sparkles,
  HardDrive,
  FolderClosed,
} from 'lucide-react';
import { TabType, Playlist } from '../../types';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  playlists: Playlist[];
  favoriteCount: number;
  totalTrackCount: number;
  isPhoneConnected?: boolean;
  onOpenAddFolder: () => void;
  onFocusSearch: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  playlists,
  favoriteCount,
  totalTrackCount,
  isPhoneConnected: _isPhoneConnected,
  onOpenAddFolder,
  onFocusSearch,
}) => {
  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-full select-none z-20 shrink-0">
      {/* App Branding */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-dark-800/60">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-aura-500 to-indigo-700 shadow-glow">
            <Sparkles className="w-5 h-5 text-white animate-pulse-subtle" />
            <div className="absolute inset-0 rounded-xl bg-aura-400 blur-md opacity-40 -z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-wider text-white bg-gradient-to-r from-white via-dark-100 to-aura-300 bg-clip-text text-transparent">
                Aura
              </span>
            </div>
            <p className="text-[10px] text-dark-400 font-medium">Desktop Music Player</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Navigation */}
        <nav className="space-y-1">
          <NavItem
            icon={<Home className="w-4 h-4" />}
            label="Home"
            isActive={activeTab === 'home'}
            onClick={() => onSelectTab('home')}
          />
          <NavItem
            icon={<Search className="w-4 h-4" />}
            label="Search"
            isActive={activeTab === 'search'}
            onClick={() => {
              onSelectTab('search');
              onFocusSearch();
            }}
          />
          <NavItem
            icon={<Music className="w-4 h-4" />}
            label="Music Library"
            badge={totalTrackCount > 0 ? String(totalTrackCount) : undefined}
            isActive={
              activeTab === 'all-tracks' ||
              activeTab === 'albums' ||
              activeTab === 'artists' ||
              activeTab === 'recently-played'
            }
            onClick={() => onSelectTab('all-tracks')}
          />
          <NavItem
            icon={<Heart className="w-4 h-4 text-rose-400" />}
            label="Favorites"
            badge={favoriteCount > 0 ? String(favoriteCount) : undefined}
            isActive={activeTab === 'favorites'}
            onClick={() => onSelectTab('favorites')}
          />
        </nav>

        {/* Playlists */}
        <div>
          <div className="px-3 flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-dark-400 flex items-center gap-2">
              <ListMusic className="w-3.5 h-3.5 text-dark-400" />
              <span>Playlists</span>
            </p>
            <button
              onClick={() => onSelectTab('playlists')}
              className="text-dark-400 hover:text-aura-300 hover:bg-dark-800 p-1 rounded transition-colors"
              title="Create New Playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <nav className="space-y-1">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => onSelectTab('playlists')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors group ${
                  activeTab === 'playlists'
                    ? 'text-white bg-dark-800/80'
                    : 'text-dark-300 hover:text-white hover:bg-dark-800/50'
                }`}
              >
                <span className="truncate">{pl.name}</span>
                <span className="text-[10px] text-dark-500 group-hover:text-dark-400 font-mono">
                  {pl.trackCount}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Devices / Phone Sync */}
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-dark-400 mb-2 flex items-center gap-2">
            <Cable className="w-3.5 h-3.5 text-cyan-400" />
            <span>USB Sync</span>
          </p>
          <nav className="space-y-1">
            <button
              onClick={() => onSelectTab('phone-sync')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                activeTab === 'phone-sync'
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-dark-300 hover:text-white hover:bg-dark-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Cable className="w-4 h-4 text-cyan-400" />
                <span>Phone Sync (USB)</span>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Cable
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Footer / Folder Storage Info */}
      <div className="p-3 border-t border-dark-800/80 bg-dark-950/50 space-y-2">
        <div className="bg-dark-850/90 rounded-xl p-2.5 border border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive className="w-4 h-4 text-aura-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white truncate">Local PC Library</p>
              <p className="text-[10px] text-dark-400 truncate">
                {totalTrackCount > 0 ? `${totalTrackCount} tracks stored locally` : 'No folder linked'}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAddFolder}
            className="p-1.5 hover:bg-dark-750 text-dark-300 hover:text-white rounded-lg transition-colors"
            title="Choose Music Folder"
          >
            <FolderClosed className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, badge, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
        isActive
          ? 'bg-aura-600 text-white shadow-glow'
          : 'text-dark-300 hover:text-white hover:bg-dark-800/60'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={isActive ? 'text-white' : 'text-dark-400'}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge && (
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            isActive ? 'bg-white/20 text-white' : 'bg-dark-800 text-dark-400'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};
