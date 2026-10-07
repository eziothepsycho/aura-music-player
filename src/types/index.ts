export type TabType =
  | 'home'
  | 'search'
  | 'all-tracks'
  | 'albums'
  | 'artists'
  | 'recently-played'
  | 'favorites'
  | 'playlists'
  | 'folders'
  | 'phone-sync';

export type ViewMode = 'list' | 'grid' | 'compact';

export type SortField = 'title' | 'artist' | 'album' | 'duration' | 'dateAdded';
export type SortOrder = 'asc' | 'desc';

export type RepeatMode = 'off' | 'all' | 'one';

export type RightPanelTab = 'info' | 'queue' | 'lyrics';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl?: string;
  coverGradient?: string;
  bitrate?: string;
  format?: 'FLAC' | 'MP3' | 'WAV' | 'AAC' | 'OGG' | 'ALAC';
  year?: number;
  genre?: string;
  isFavorite?: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  dateAdded?: string;
  trackNumber?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  coverUrl?: string;
  coverGradient: string;
  trackCount: number;
  duration: number;
}

export interface Artist {
  id: string;
  name: string;
  coverUrl?: string;
  albumCount: number;
  trackCount: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackCount: number;
  coverGradient?: string;
  isCustom?: boolean;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 100
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  playbackRate: number;
}

export interface PhoneSyncDevice {
  isConnected: boolean;
  deviceName: string;
  osType: 'Android' | 'iOS' | 'MTP' | 'None';
  status: 'disconnected' | 'ready' | 'syncing' | 'synced';
  phoneTracksCount: number;
  pendingSyncCount: number;
  storageUsedGB: number;
  storageTotalGB: number;
}
