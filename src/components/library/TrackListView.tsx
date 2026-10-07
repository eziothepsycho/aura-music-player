import React from 'react';
import { Play, Pause, Heart, Clock, Music, FolderOpen, Trash2 } from 'lucide-react';
import { Track, ViewMode } from '../../types';
import { formatTime } from '../../utils/formatters';

interface TrackListViewProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onDeleteTrack?: (track: Track) => void;
  viewMode: ViewMode;
}

export const TrackListView: React.FC<TrackListViewProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onToggleFavorite,
  onDeleteTrack,
  viewMode,
}) => {
  const isCompact = viewMode === 'compact';

  const handleOpenFileLocation = (filePath?: string) => {
    if (filePath && window.auraAPI?.showItemInFolder) {
      window.auraAPI.showItemInFolder(filePath);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {/* Table Header */}
      <div
        className={`grid ${
          isCompact
            ? 'grid-cols-[40px_1fr_1fr_100px_80px_70px]'
            : 'grid-cols-[48px_minmax(200px,2fr)_minmax(140px,1.5fr)_minmax(120px,1fr)_90px_70px]'
        } items-center px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-dark-400 border-b border-dark-800 mb-1 select-none`}
      >
        <span className="text-center">#</span>
        <span>Title</span>
        <span>Album</span>
        <span className="hidden md:inline">Quality</span>
        <span className="flex items-center justify-end gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Time</span>
        </span>
        <span className="text-right">Actions</span>
      </div>

      {/* Track Rows */}
      <div className="space-y-1">
        {tracks.map((track, index) => {
          const isCurrent = currentTrackId === track.id;
          return (
            <div
              key={track.id}
              onDoubleClick={() => onPlayTrack(track)}
              className={`group grid ${
                isCompact
                  ? 'grid-cols-[40px_1fr_1fr_100px_80px_70px] py-2'
                  : 'grid-cols-[48px_minmax(200px,2fr)_minmax(140px,1.5fr)_minmax(120px,1fr)_90px_70px] py-2.5'
              } items-center px-4 rounded-xl transition-all cursor-pointer select-none ${
                isCurrent
                  ? 'bg-aura-600/15 border border-aura-500/30 text-white shadow-sm'
                  : 'hover:bg-dark-850 border border-transparent text-dark-200'
              }`}
            >
              {/* # Index / Play Button */}
              <div className="flex items-center justify-center">
                <span
                  className={`text-xs font-mono font-medium group-hover:hidden ${
                    isCurrent ? 'text-aura-400 font-bold' : 'text-dark-400'
                  }`}
                >
                  {isCurrent && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 bg-aura-400 animate-eq-1" />
                      <span className="w-0.5 bg-aura-400 animate-eq-2" />
                      <span className="w-0.5 bg-aura-400 animate-eq-3" />
                    </div>
                  ) : (
                    track.trackNumber || index + 1
                  )}
                </span>
                <button
                  onClick={() => onPlayTrack(track)}
                  className="hidden group-hover:flex items-center justify-center w-7 h-7 rounded-lg bg-aura-500 hover:bg-aura-400 text-white shadow-sm transition-transform active:scale-95"
                  title={isCurrent && isPlaying ? 'Pause' : 'Play'}
                >
                  {isCurrent && isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>
              </div>

              {/* Title & Artist & Artwork Thumbnail */}
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {!isCompact && (
                  <div className="w-9 h-9 rounded-lg bg-dark-800 overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-dark-750">
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${
                          track.coverGradient || 'from-violet-600 to-indigo-900'
                        } flex items-center justify-center text-white/80`}
                      >
                        <Music className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold truncate ${
                      isCurrent ? 'text-aura-300' : 'text-white'
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="text-[11px] text-dark-400 truncate hover:text-dark-200 transition-colors">
                    {track.artist}
                  </p>
                </div>
              </div>

              {/* Album */}
              <div className="truncate text-xs text-dark-300 pr-2">{track.album}</div>

              {/* Format / Bitrate Badge */}
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-dark-800 text-aura-300 border border-dark-750">
                  {track.format || 'MP3'}
                </span>
                <span className="text-[10px] text-dark-400 font-mono hidden lg:inline truncate">
                  {track.bitrate ? track.bitrate.split('•')[0] : 'Audio'}
                </span>
              </div>

              {/* Duration */}
              <div className="text-right font-mono text-xs text-dark-400">
                {formatTime(track.duration)}
              </div>

              {/* Actions (Heart & Reveal in Explorer) */}
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(track.id);
                  }}
                  className={`p-1.5 rounded-md transition-colors ${
                    track.isFavorite
                      ? 'text-rose-400 hover:text-rose-300'
                      : 'text-dark-500 hover:text-white opacity-0 group-hover:opacity-100'
                  }`}
                  title={track.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${track.isFavorite ? 'fill-current' : ''}`}
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFileLocation(track.filePath);
                  }}
                  className="p-1.5 rounded-md text-dark-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Show in Windows Explorer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
                {onDeleteTrack && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTrack(track);
                    }}
                    className="p-1.5 rounded-md text-dark-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete from Library"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
