import { useState, useEffect, useRef, useCallback } from 'react';
import { Track, RepeatMode } from '../types';

export function useAudioEngine(initialTracks: Track[] = []) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1.0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>([]);

  // Initialize HTML5 Audio instance
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      const mediaError = audio.error;
      console.error(
        '[Audio Engine] Media element error:',
        mediaError ? `code=${mediaError.code} (${mediaError.message})` : 'unknown',
        '| src =',
        audio.currentSrc || audio.src
      );
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update Media Session for Windows Lock Screen / Media Keys
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;

    const artwork: MediaImage[] = [];
    if (currentTrack.coverUrl) {
      artwork.push({ src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' });
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork,
    });
  }, [currentTrack]);

  // Set audio source safely
  const getAudioUrl = (track: Track): string => {
    if (window.auraAPI?.getAudioUrl && track.filePath) {
      return window.auraAPI.getAudioUrl(track.filePath);
    }
    return track.filePath || '';
  };

  // Play a specific track
  const playTrack = useCallback(
    (track: Track, newQueue?: Track[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      const url = getAudioUrl(track);
      if (!url) {
        console.warn('[Audio Engine] No valid audio URL for track:', track.title);
        return;
      }

      audio.src = url;
      audio.playbackRate = playbackSpeed;
      audio.volume = isMuted ? 0 : volume / 100;
      audio
        .play()
        .then(() => {
          setCurrentTrack(track);
          setIsPlaying(true);
          setDuration(track.duration || audio.duration || 0);

          // Update recently played
          setRecentlyPlayedIds((prev) => [track.id, ...prev.filter((id) => id !== track.id)].slice(0, 50));

          if (newQueue) {
            setQueue(newQueue.filter((t) => t.id !== track.id));
          }
        })
        .catch((err) => {
          console.error(`[Audio Engine] Play failed for "${track.title}" (src: ${url}):`, err);
        });
    },
    [playbackSpeed, isMuted, volume]
  );

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (audio.src) {
        audio.play().catch(console.warn);
      } else if (currentTrack) {
        playTrack(currentTrack);
      } else if (initialTracks.length > 0) {
        playTrack(initialTracks[0], initialTracks);
      }
    }
  }, [isPlaying, currentTrack, initialTracks, playTrack]);

  // Next Track
  const nextTrack = useCallback(() => {
    if (queue.length > 0) {
      const next = queue[0];
      const rest = queue.slice(1);
      playTrack(next, rest);
    } else if (initialTracks.length > 0) {
      if (isShuffled) {
        const randomIndex = Math.floor(Math.random() * initialTracks.length);
        playTrack(initialTracks[randomIndex], initialTracks);
      } else {
        const currentIndex = initialTracks.findIndex((t) => t.id === currentTrack?.id);
        const nextIndex = (currentIndex + 1) % initialTracks.length;
        playTrack(initialTracks[nextIndex], initialTracks);
      }
    }
  }, [queue, initialTracks, isShuffled, currentTrack, playTrack]);

  // Previous Track
  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (initialTracks.length > 0) {
      const currentIndex = initialTracks.findIndex((t) => t.id === currentTrack?.id);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : initialTracks.length - 1;
      playTrack(initialTracks[prevIndex], initialTracks);
    }
  }, [initialTracks, currentTrack, playTrack]);

  // Track Ended event handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else if (queue.length > 0) {
        nextTrack();
      } else if (repeatMode === 'all' && initialTracks.length > 0) {
        nextTrack();
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [repeatMode, queue, initialTracks, nextTrack]);

  // Seek
  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || duration || 0));
    setCurrentTime(audio.currentTime);
  }, [duration]);

  // Volume
  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped / 100;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  // Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume / 100;
      }
      return next;
    });
  }, [volume]);

  // Speed
  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  // Shuffle
  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => !prev);
  }, []);

  // Repeat
  const cycleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    setRepeatMode((prev) => {
      const idx = modes.indexOf(prev);
      return modes[(idx + 1) % modes.length];
    });
  }, []);

  // Stop/clean up when the track currently loaded in the engine is deleted
  const handleTrackRemoved = useCallback(
    (trackId: string) => {
      setQueue((prev) => prev.filter((t) => t.id !== trackId));
      setRecentlyPlayedIds((prev) => prev.filter((id) => id !== trackId));

      if (currentTrack?.id === trackId) {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
          try {
            audio.load();
          } catch {
            /* ignore */
          }
        }
        setCurrentTrack(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
    },
    [currentTrack]
  );

  // Keyboard Shortcuts Listener (Space, M, Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.ctrlKey && e.code === 'ArrowRight') {
        e.preventDefault();
        nextTrack();
      } else if (e.ctrlKey && e.code === 'ArrowLeft') {
        e.preventDefault();
        prevTrack();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (audioRef.current) seek(audioRef.current.currentTime + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (audioRef.current) seek(audioRef.current.currentTime - 5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, nextTrack, prevTrack, seek]);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffled,
    repeatMode,
    playbackSpeed,
    queue,
    recentlyPlayedIds,
    setQueue,
    playTrack,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    setPlaybackSpeed,
    toggleShuffle,
    cycleRepeat,
    handleTrackRemoved,
    setCurrentTrack,
  };
}

