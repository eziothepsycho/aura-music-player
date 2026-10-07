import React, { useState } from 'react';
import {
  X,
  Disc3,
  Music,
  ListMusic,
  Mic2,
  Info,
  Sparkles,
  Heart,
  Trash2,
  Keyboard,
  FolderOpen,
} from 'lucide-react';
import { Track, RightPanelTab } from '../../types';
import { formatTime } from '../../utils/formatters';

interface NowPlayingPanelProps {
  currentTrack: Track | null;
  queue: Track[];
  isOpen: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track) => void;
  onRemoveFromQueue: (trackId: string) => void;
  onClearQueue: () => void;
  onToggleFavorite: (trackId: string) => void;
}

export const NowPlayingPanel: React.FC<NowPlayingPanelProps> = ({
  currentTrack,
  queue,
  isOpen,
  onClose,
  onPlayTrack,
  onRemoveFromQueue,
  onClearQueue,
  onToggleFavorite,
}) => {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('info');

  if (!isOpen) return null;

  const handleRevealInFolder = () => {
    if (currentTrack?.filePath && window.auraAPI?.showItemInFolder) {
      window.auraAPI.showItemInFolder(currentTrack.filePath);
    }
  };

  return (
    <aside className="w-80 bg-dark-900 border-l border-dark-800 flex flex-col h-full select-none z-20 shrink-0">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-dark-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-aura-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Now Playing</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* 1. Album Artwork */}
        <div className="relative group">
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl bg-dark-850 flex items-center justify-center border border-dark-750">
            {currentTrack?.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : currentTrack ? (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  currentTrack.coverGradient || 'from-violet-600 to-indigo-950'
                } flex flex-col items-center justify-center p-6 text-center`}
              >
                <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center bg-black/25 shadow-inner mb-2">
                  <Disc3 className="w-12 h-12 text-white/70 animate-spin-slow" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-dark-500">
                <Music className="w-12 h-12 mb-2 stroke-[1.5]" />
                <p className="text-xs font-medium">No track playing</p>
              </div>
            )}

            {/* Glowing Aura Ring */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none" />
          </div>
        </div>

        {/* 2. Track Metadata: Song Name, Artist, Album */}
        {currentTrack ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-base font-bold text-white truncate">{currentTrack.title}</h4>
                <p className="text-xs font-medium text-aura-300 truncate mt-0.5">{currentTrack.artist}</p>
                <p className="text-[11px] text-dark-400 truncate">{currentTrack.album}</p>
              </div>
              <button
                onClick={() => onToggleFavorite(currentTrack.id)}
                className={`p-2 rounded-xl border transition-colors shrink-0 ${
                  currentTrack.isFavorite
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-dark-850 border-dark-750 text-dark-400 hover:text-white'
                }`}
                title="Favorite Track"
              >
                <Heart
                  className={`w-4 h-4 ${currentTrack.isFavorite ? 'fill-current' : ''}`}
                />
              </button>
            </div>

            {/* Format & Quality Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="px-2 py-0.5 rounded-md bg-aura-500/15 border border-aura-500/30 text-[10px] font-mono font-bold text-aura-300">
                {currentTrack.format || 'MP3'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-dark-800 border border-dark-750 text-[10px] font-mono text-dark-300">
                {currentTrack.bitrate || 'Lossless'}
              </span>
              {currentTrack.year && (
                <span className="px-2 py-0.5 rounded-md bg-dark-800 border border-dark-750 text-[10px] text-dark-300 font-mono">
                  {currentTrack.year}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* 3. Keyboard Controls (From Wireframe) */}
        <div className="bg-dark-850/80 rounded-2xl border border-dark-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-white text-xs font-bold">
            <Keyboard className="w-4 h-4 text-aura-400" />
            <span>Keyboard Controls</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center justify-between p-1.5 bg-dark-900/60 rounded-lg border border-dark-800/80">
              <span className="text-dark-400">Play / Pause</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-white bg-dark-800 border border-dark-700 rounded">
                Space
              </kbd>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-dark-900/60 rounded-lg border border-dark-800/80">
              <span className="text-dark-400">Mute</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-white bg-dark-800 border border-dark-700 rounded">
                M
              </kbd>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-dark-900/60 rounded-lg border border-dark-800/80">
              <span className="text-dark-400">Next Track</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-white bg-dark-800 border border-dark-700 rounded">
                Ctrl + →
              </kbd>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-dark-900/60 rounded-lg border border-dark-800/80">
              <span className="text-dark-400">Prev Track</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-white bg-dark-800 border border-dark-700 rounded">
                Ctrl + ←
              </kbd>
            </div>
          </div>
        </div>

        {/* 4. Sub-tab Navigation (Queue / Lyrics / Info) */}
        <div className="border-t border-dark-800 pt-4">
          <div className="flex items-center bg-dark-850 p-1 rounded-xl border border-dark-800 mb-3">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'info'
                  ? 'bg-aura-600 text-white shadow-sm'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Info</span>
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'queue'
                  ? 'bg-aura-600 text-white shadow-sm'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Queue ({queue.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'lyrics'
                  ? 'bg-aura-600 text-white shadow-sm'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>Lyrics</span>
            </button>
          </div>

          {/* Sub-tab Content */}
          {activeTab === 'queue' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-dark-400 uppercase tracking-wider px-1">
                <span>Up Next</span>
                {queue.length > 0 && (
                  <button
                    onClick={onClearQueue}
                    className="hover:text-rose-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="p-6 text-center bg-dark-850/40 rounded-xl border border-dark-800 text-dark-400 text-xs">
                  Queue is empty. Play or queue songs from your library.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {queue.map((track, i) => (
                    <div
                      key={track.id + i}
                      className="group flex items-center justify-between p-2 rounded-lg bg-dark-850/60 hover:bg-dark-800 border border-dark-800 transition-colors"
                    >
                      <div
                        onClick={() => onPlayTrack(track)}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                      >
                        <div className="w-7 h-7 rounded bg-dark-800 overflow-hidden flex items-center justify-center shrink-0 border border-dark-750">
                          {track.coverUrl ? (
                            <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-[10px] font-bold">{i + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{track.title}</p>
                          <p className="text-[10px] text-dark-400 truncate">{track.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 pl-2">
                        <span className="text-[10px] font-mono text-dark-400">
                          {formatTime(track.duration)}
                        </span>
                        <button
                          onClick={() => onRemoveFromQueue(track.id)}
                          className="p-1 text-dark-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'lyrics' && (
            <div className="p-6 text-center bg-dark-850/40 rounded-xl border border-dark-800 text-dark-400 text-xs space-y-2">
              <Mic2 className="w-8 h-8 text-aura-400/40 mx-auto" />
              <p className="font-semibold text-dark-200">Lyrics Mode</p>
              <p className="text-[11px] text-dark-400">
                Synchronized LRC and offline metadata tags will display here.
              </p>
            </div>
          )}

          {activeTab === 'info' && currentTrack && (
            <div className="bg-dark-850/50 rounded-xl border border-dark-800 p-3 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-dark-800 pb-1.5">
                <span className="text-dark-400">Audio Codec</span>
                <span className="font-mono text-white">{currentTrack.format || 'MP3'}</span>
              </div>
              <div className="flex justify-between border-b border-dark-800 pb-1.5">
                <span className="text-dark-400">Bitrate & Specs</span>
                <span className="font-mono text-white truncate max-w-[150px]">{currentTrack.bitrate || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-dark-800 pb-1.5">
                <span className="text-dark-400">Duration</span>
                <span className="font-mono text-white">{formatTime(currentTrack.duration)}</span>
              </div>
              {currentTrack.filePath && (
                <div className="flex flex-col pt-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400 text-[10px]">Local PC File Path</span>
                    <button
                      onClick={handleRevealInFolder}
                      className="text-[10px] text-aura-400 hover:text-aura-300 flex items-center gap-1"
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span>Show in Explorer</span>
                    </button>
                  </div>
                  <span className="font-mono text-[10px] text-dark-300 break-all bg-dark-900 p-2 rounded border border-dark-800">
                    {currentTrack.filePath}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
