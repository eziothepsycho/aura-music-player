import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  Music,
  ListMusic,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { Track, RepeatMode } from '../../types';
import { formatTime } from '../../utils/formatters';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isShuffled: boolean;
  onToggleShuffle: () => void;
  repeatMode: RepeatMode;
  onCycleRepeat: () => void;
  onToggleFavorite: (trackId: string) => void;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  playbackSpeed: number;
  onChangePlaybackSpeed: (speed: number) => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isShuffled,
  onToggleShuffle,
  repeatMode,
  onCycleRepeat,
  onToggleFavorite,
  isRightPanelOpen,
  onToggleRightPanel,
  playbackSpeed,
  onChangePlaybackSpeed,
}) => {
  const effectiveDuration = duration || (currentTrack ? currentTrack.duration : 0);
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
  const effectiveVolume = isMuted ? 0 : volume;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * effectiveDuration;
    onSeek(newTime);
  };

  const getVolumeIcon = () => {
    if (isMuted || effectiveVolume === 0) return <VolumeX className="w-4 h-4 text-dark-400" />;
    if (effectiveVolume < 50) return <Volume1 className="w-4 h-4 text-dark-300" />;
    return <Volume2 className="w-4 h-4 text-dark-200" />;
  };

  return (
    <footer className="h-24 bg-dark-900/95 backdrop-blur-xl border-t border-dark-800 px-6 flex items-center justify-between gap-6 select-none z-30 shrink-0">
      {/* 1. Left Section: Artwork + Song Name + Artist */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        {currentTrack ? (
          <>
            <div
              className="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center shrink-0 shadow-md border border-dark-750 group cursor-pointer relative overflow-hidden"
              onClick={onToggleRightPanel}
              title="Toggle Now Playing Panel"
            >
              {currentTrack.coverUrl ? (
                <img
                  src={currentTrack.coverUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${
                    currentTrack.coverGradient || 'from-violet-600 to-indigo-900'
                  } flex items-center justify-center`}
                >
                  <Music className="w-6 h-6 text-white/80 group-hover:scale-110 transition-transform" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate hover:underline cursor-pointer">
                {currentTrack.title}
              </p>
              <p className="text-[11px] text-dark-400 truncate mt-0.5">{currentTrack.artist}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-dark-500">
            <div className="w-12 h-12 rounded-xl bg-dark-850 border border-dark-800 flex items-center justify-center">
              <Music className="w-5 h-5 text-dark-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-dark-400">Ready to Play</p>
              <p className="text-[11px] text-dark-500">Offline PC Library</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Center Section: Timeline Progress + Playback Deck */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-2xl">
        {/* Buttons Row: 🔀  ◀  ▶  ▶  🔁 */}
        <div className="flex items-center gap-4">
          {/* 🔀 Shuffle */}
          <button
            onClick={onToggleShuffle}
            className={`p-2 rounded-lg transition-colors relative ${
              isShuffled
                ? 'text-aura-400 hover:text-aura-300 bg-aura-500/10'
                : 'text-dark-400 hover:text-white'
            }`}
            title={`Shuffle: ${isShuffled ? 'On' : 'Off'}`}
          >
            <Shuffle className="w-4 h-4" />
            {isShuffled && (
              <span className="w-1 h-1 bg-aura-400 rounded-full absolute bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </button>

          {/* ◀ Previous */}
          <button
            onClick={onPrevious}
            className="p-2 rounded-lg text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
            title="Previous Track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* ▶ / ⏸ Play / Pause */}
          <button
            onClick={onTogglePlay}
            className="relative w-11 h-11 rounded-full bg-gradient-to-tr from-aura-600 to-indigo-500 hover:from-aura-500 hover:to-indigo-400 text-white flex items-center justify-center shadow-glow transition-all active:scale-95 group"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
            <div className="absolute inset-0 rounded-full bg-aura-400 blur-sm opacity-0 group-hover:opacity-40 transition-opacity -z-10" />
          </button>

          {/* ▶ Next */}
          <button
            onClick={onNext}
            className="p-2 rounded-lg text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
            title="Next Track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* 🔁 Repeat */}
          <button
            onClick={onCycleRepeat}
            className={`p-2 rounded-lg transition-colors relative ${
              repeatMode !== 'off'
                ? 'text-aura-400 hover:text-aura-300 bg-aura-500/10'
                : 'text-dark-400 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
            {repeatMode !== 'off' && (
              <span className="w-1 h-1 bg-aura-400 rounded-full absolute bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </button>
        </div>

        {/* ──────────── Progress Bar ──────────── */}
        <div className="w-full flex items-center gap-3 select-none">
          <span className="text-[11px] font-mono text-dark-400 w-10 text-right">
            {formatTime(currentTime)}
          </span>

          <div className="relative flex-1 range-group flex items-center group">
            <div className="w-full h-1.5 bg-dark-750 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-aura-500 to-indigo-400 group-hover:from-aura-400 group-hover:to-indigo-300 rounded-full transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progressPercent || 0}
              onChange={handleSeekChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <span className="text-[11px] font-mono text-dark-400 w-10 text-left">
            {formatTime(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* 3. Right Section: 🔊 Volume | ♡ Favorite | ☷ Playlists/Queue | Mini Player */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
        {/* Playback Speed selector */}
        <button
          onClick={() => {
            const speeds = [1.0, 1.25, 1.5, 0.75];
            const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
            onChangePlaybackSpeed(speeds[nextIdx]);
          }}
          className="px-2 py-1 rounded-md bg-dark-850 hover:bg-dark-800 text-[10px] font-mono font-bold text-dark-300 hover:text-white border border-dark-800 transition-colors"
          title="Playback Speed"
        >
          {playbackSpeed}x
        </button>

        {/* 🔊 Volume */}
        <div className="flex items-center gap-2 range-group group">
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {getVolumeIcon()}
          </button>
          <div className="relative w-20 flex items-center">
            <div className="w-full h-1 bg-dark-750 rounded-full overflow-hidden">
              <div
                className="h-full bg-aura-400 rounded-full group-hover:bg-aura-300 transition-all"
                style={{ width: `${effectiveVolume}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={effectiveVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* ♡ Favorite */}
        {currentTrack && (
          <button
            onClick={() => onToggleFavorite(currentTrack.id)}
            className={`p-2 rounded-lg transition-colors ${
              currentTrack.isFavorite
                ? 'text-rose-400 hover:text-rose-300'
                : 'text-dark-400 hover:text-white'
            }`}
            title={currentTrack.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
          >
            <Heart
              className={`w-4 h-4 ${currentTrack.isFavorite ? 'fill-current' : ''}`}
            />
          </button>
        )}

        {/* ☷ Queue / Now Playing Toggle */}
        <button
          onClick={onToggleRightPanel}
          className={`p-2 rounded-lg border transition-colors ${
            isRightPanelOpen
              ? 'bg-aura-500/15 border-aura-500/30 text-aura-300'
              : 'bg-dark-850 border-dark-800 text-dark-400 hover:text-white'
          }`}
          title="Play Queue & Info Panel"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Mini Player */}
        <button
          onClick={() => console.log('Mini Player')}
          className="p-2 rounded-lg bg-dark-850 border border-dark-800 text-dark-400 hover:text-white transition-colors"
          title="Mini Player"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
