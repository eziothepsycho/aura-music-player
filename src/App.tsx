import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { TabType, ViewMode, SortField, SortOrder, Track, Album, Playlist } from './types';
import {
  SAMPLE_TRACKS,
  SAMPLE_ALBUMS,
  SAMPLE_ARTISTS,
  SAMPLE_PLAYLISTS,
  SAMPLE_PHONE_DEVICE,
} from './data/mockData';
import { useAudioEngine } from './hooks/useAudioEngine';
import { deriveAlbums, deriveArtists } from './utils/libraryUtils';
import { Sidebar } from './components/sidebar/Sidebar';
import { Header } from './components/header/Header';
import { LibraryTabs } from './components/library/LibraryTabs';
import { EmptyLibraryState } from './components/library/EmptyLibraryState';
import { TrackListView } from './components/library/TrackListView';
import { TrackGridView } from './components/library/TrackGridView';
import { PhoneSyncView } from './components/library/PhoneSyncView';
import { NowPlayingPanel } from './components/now-playing/NowPlayingPanel';
import { PlayerBar } from './components/player/PlayerBar';
import { AddFolderModal } from './components/modals/AddFolderModal';
import { CreatePlaylistModal } from './components/modals/CreatePlaylistModal';
import { DeleteTrackModal } from './components/modals/DeleteTrackModal';
import { UploadCloud, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<TabType>('all-tracks');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);

  // Delete-from-library flow
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [phoneSyncDir, setPhoneSyncDir] = useState<string>('');

  // Toggle between real local library & sample demo tracks
  const [showSampleData, setShowSampleData] = useState(false);

  // Real Scanned Library State
  const [scannedTracks, setScannedTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>(SAMPLE_PLAYLISTS);

  // Global Drag and Drop state
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [importNotification, setImportNotification] = useState<{
    status: 'importing' | 'success' | 'error';
    message: string;
  } | null>(null);
  const dragCounter = useRef(0);

  // Safe track sanitizer to protect React against null/missing properties
  const sanitizeTracks = (rawTracks: unknown[]): Track[] => {
    if (!Array.isArray(rawTracks)) return [];
    const valid: Track[] = [];
    for (let i = 0; i < rawTracks.length; i++) {
      const t = rawTracks[i] as any;
      if (!t || typeof t !== 'object') continue;
      valid.push({
        id: typeof t.id === 'string' && t.id ? t.id : `track-${i}-${Date.now()}`,
        title: typeof t.title === 'string' && t.title ? t.title : (typeof t.fileName === 'string' ? t.fileName : 'Unknown Title'),
        artist: typeof t.artist === 'string' && t.artist ? t.artist : 'Unknown Artist',
        album: typeof t.album === 'string' && t.album ? t.album : 'Unknown Album',
        duration: typeof t.duration === 'number' && !isNaN(t.duration) ? t.duration : 0,
        format: t.format || 'MP3',
        bitrate: typeof t.bitrate === 'string' ? t.bitrate : undefined,
        coverUrl: typeof t.coverUrl === 'string' ? t.coverUrl : undefined,
        coverGradient: typeof t.coverGradient === 'string' ? t.coverGradient : undefined,
        year: typeof t.year === 'number' && !isNaN(t.year) ? t.year : undefined,
        genre: typeof t.genre === 'string' ? t.genre : undefined,
        isFavorite: !!t.isFavorite,
        filePath: typeof t.filePath === 'string' ? t.filePath : '',
        fileName: typeof t.fileName === 'string' && t.fileName ? t.fileName : undefined,
        fileSize: typeof t.fileSize === 'number' && t.fileSize > 0 ? t.fileSize : undefined,
        dateAdded: typeof t.dateAdded === 'string' ? t.dateAdded : new Date().toISOString().split('T')[0],
        trackNumber: typeof t.trackNumber === 'number' ? t.trackNumber : undefined,
      });
    }
    return valid;
  };

  // Load persistent library from disk on startup
  const loadStoredLibrary = useCallback(async () => {
    if (window.auraAPI?.getLibraryState) {
      try {
        const state = await window.auraAPI.getLibraryState();
        if (state && Array.isArray(state.songs)) {
          const cleanSongs = sanitizeTracks(state.songs);
          setScannedTracks(cleanSongs);
          if (state.playlists && state.playlists.length > 0) {
            setPlaylists(
              state.playlists.map((pl: any) => ({
                id: pl.id || `pl-${Math.random()}`,
                name: pl.name || 'Untitled Playlist',
                description: pl.description || '',
                trackCount: pl.songIds?.length || 0,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Failed to load stored library state:', err);
      }
    }
  }, []);

  useEffect(() => {
    loadStoredLibrary();
  }, [loadStoredLibrary]);

  // Track where Aura stores phone-copied files (for delete messaging)
  useEffect(() => {
    let cancelled = false;
    window.auraAPI
      ?.getPhoneSyncDir?.()
      .then((dir: string) => {
        if (!cancelled && typeof dir === 'string') setPhoneSyncDir(dir);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Active tracks pool
  const activeTracksPool = useMemo(() => {
    return showSampleData ? SAMPLE_TRACKS : scannedTracks;
  }, [showSampleData, scannedTracks]);

  // Audio Engine instance managing HTML5 Audio, playback, scrubber, media keys
  const audioEngine = useAudioEngine(activeTracksPool);

  // Dynamically derived Albums & Artists
  const derivedAlbums = useMemo(() => {
    return showSampleData ? SAMPLE_ALBUMS : deriveAlbums(scannedTracks);
  }, [showSampleData, scannedTracks]);

  const derivedArtists = useMemo(() => {
    return showSampleData ? SAMPLE_ARTISTS : deriveArtists(scannedTracks);
  }, [showSampleData, scannedTracks]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toggle Sample Data on/off
  const handleToggleSampleData = () => {
    setShowSampleData((prev) => !prev);
    setSelectedAlbumFilter(null);
    setSelectedPlaylist(null);
  };

  // Global Drag and Drop event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFiles(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingFiles(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingFiles(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setImportNotification({
      status: 'importing',
      message: `Importing ${files.length} item(s)...`,
    });

    try {
      const nativePaths: string[] = [];
      let binaryImportedCount = 0;

      for (const file of files) {
        const nativePath = window.auraAPI?.getPathForFile ? window.auraAPI.getPathForFile(file) : '';
        if (nativePath) {
          nativePaths.push(nativePath);
        } else {
          // MTP dropped file or memory stream without standard Win32 file path
          if (/\.(mp3|flac|wav|m4a|ogg|aac|wma|opus)$/i.test(file.name) && window.auraAPI?.importBinaryFile) {
            const buffer = await file.arrayBuffer();
            const res = await window.auraAPI.importBinaryFile(file.name, buffer);
            if (res?.success) binaryImportedCount++;
          }
        }
      }

      let nativeImportedCount = 0;
      if (nativePaths.length > 0 && window.auraAPI?.importDroppedPaths) {
        const res = await window.auraAPI.importDroppedPaths(nativePaths);
        if (res?.success) {
          nativeImportedCount = res.importedCount || 0;
        }
      }

      const totalImported = nativeImportedCount + binaryImportedCount;
      await loadStoredLibrary();

      if (showSampleData) {
        setShowSampleData(false);
      }

      if (totalImported > 0) {
        setImportNotification({
          status: 'success',
          message: `Successfully imported ${totalImported} track(s) into your library`,
        });
        if (activeTab !== 'all-tracks') {
          setActiveTab('all-tracks');
        }
      } else {
        setImportNotification({
          status: 'error',
          message: 'No supported audio files found in dropped items',
        });
      }
    } catch (err: any) {
      console.error('Drop import error:', err);
      setImportNotification({
        status: 'error',
        message: err.message || 'Failed to import dropped files',
      });
    } finally {
      setTimeout(() => {
        setImportNotification((prev) => (prev?.status === 'importing' ? prev : null));
      }, 5000);
    }
  };

  // Filtered & Sorted Tracks
  const displayedTracks = useMemo(() => {
    let result = [...activeTracksPool];

    // Filter by Tab
    if (activeTab === 'favorites') {
      result = result.filter((t) => t.isFavorite);
    } else if (activeTab === 'recently-played') {
      const recentSet = new Set(audioEngine.recentlyPlayedIds);
      result = result.filter((t) => recentSet.has(t.id));
    }

    // Filter by Album if an album is clicked
    if (selectedAlbumFilter) {
      const targetAlbum = selectedAlbumFilter.toLowerCase();
      result = result.filter((t) => (t.album || '').toLowerCase() === targetAlbum);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.artist || '').toLowerCase().includes(q) ||
          (t.album || '').toLowerCase().includes(q) ||
          (t.genre ? t.genre.toLowerCase().includes(q) : false)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      const titleA = a.title || '';
      const titleB = b.title || '';
      const artistA = a.artist || '';
      const artistB = b.artist || '';
      const albumA = a.album || '';
      const albumB = b.album || '';

      if (sortField === 'title') comparison = titleA.localeCompare(titleB);
      else if (sortField === 'artist') comparison = artistA.localeCompare(artistB);
      else if (sortField === 'album') comparison = albumA.localeCompare(albumB);
      else if (sortField === 'duration') comparison = (a.duration || 0) - (b.duration || 0);
      else if (sortField === 'dateAdded')
        comparison = (a.dateAdded || '').localeCompare(b.dateAdded || '');

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [activeTracksPool, activeTab, selectedAlbumFilter, searchQuery, sortField, sortOrder, audioEngine.recentlyPlayedIds]);

  // Favorite toggle handler with storage update
  const handleToggleFavorite = (trackId: string) => {
    setScannedTracks((prev) => {
      const updated = prev.map((t) => (t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t));
      if (window.auraAPI?.saveLibraryState) {
        window.auraAPI.saveLibraryState({
          folders: [],
          songs: updated,
          favorites: updated.filter((t) => t.isFavorite).map((t) => t.id),
          recentlyPlayed: audioEngine.recentlyPlayedIds,
          playlists,
        });
      }
      return updated;
    });
    if (audioEngine.currentTrack?.id === trackId) {
      audioEngine.setCurrentTrack({
        ...audioEngine.currentTrack,
        isFavorite: !audioEngine.currentTrack.isFavorite,
      });
    }
  };

  const handleCreatePlaylist = (name: string, description: string) => {
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      trackCount: 0,
      isCustom: true,
    };
    setPlaylists((prev) => {
      const updated = [...prev, newPlaylist];
      if (window.auraAPI?.saveLibraryState) {
        window.auraAPI.saveLibraryState({
          folders: [],
          songs: scannedTracks,
          favorites: scannedTracks.filter((t) => t.isFavorite).map((t) => t.id),
          recentlyPlayed: audioEngine.recentlyPlayedIds,
          playlists: updated,
        });
      }
      return updated;
    });
  };

  const handleScanComplete = (_newCount: number, _totalCount: number) => {
    setShowSampleData(false);
    loadStoredLibrary();
  };

  // ---- Delete song from library (record + managed local file + caches) ----
  const normalizePath = (p: string) => p.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();

  const isAuraManagedTrack = (track: Track): boolean => {
    if (!phoneSyncDir || !track.filePath) return false;
    const file = normalizePath(track.filePath);
    const managed = normalizePath(phoneSyncDir);
    return file === managed || file.startsWith(managed + '\\');
  };

  const handleRequestDelete = (track: Track) => {
    if (showSampleData) {
      setImportNotification({ status: 'error', message: 'Sample tracks cannot be deleted' });
      setTimeout(() => setImportNotification(null), 4000);
      return;
    }
    if (!window.auraAPI?.deleteSong) return;
    setTrackToDelete(track);
  };

  const handleConfirmDelete = async () => {
    const track = trackToDelete;
    setTrackToDelete(null);
    if (!track || !window.auraAPI?.deleteSong) return;

    setIsDeleting(true);
    setImportNotification({ status: 'importing', message: `Removing "${track.title}"...` });
    try {
      // Stop playback FIRST so the audio element releases the OS file handle
      // before we try to delete the local copy (avoids EPERM on Windows).
      audioEngine.handleTrackRemoved(track.id);

      const res = await window.auraAPI.deleteSong(track.id);
      if (res?.success) {
        await loadStoredLibrary();
        setImportNotification({
          status: 'success',
          message: res.fileDeleted
            ? `Deleted "${track.title}" and its local copy`
            : `Removed "${track.title}" from library`,
        });
      } else {
        setImportNotification({
          status: 'error',
          message: res?.message || 'Failed to remove song',
        });
      }
    } catch (err: any) {
      setImportNotification({
        status: 'error',
        message: err?.message || 'Failed to remove song',
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => {
        setImportNotification((prev) => (prev?.status === 'importing' ? prev : null));
      }, 5000);
    }
  };

  const favoriteCount = useMemo(() => activeTracksPool.filter((t) => t.isFavorite).length, [activeTracksPool]);

  const activeTabTitles: Record<TabType, string> = {
    home: 'Home',
    search: 'Search Library',
    'all-tracks': selectedAlbumFilter ? `Album: ${selectedAlbumFilter}` : 'Tracks',
    albums: 'Albums',
    artists: 'Artists',
    'recently-played': 'Recently Played',
    playlists: selectedPlaylist ? `Playlist: ${selectedPlaylist.name}` : 'Playlists',
    favorites: 'Favorites',
    folders: 'Music Folders',
    'phone-sync': 'Devices & Android Phone Sync',
  };

  const isLibraryTab =
    activeTab === 'all-tracks' ||
    activeTab === 'albums' ||
    activeTab === 'artists' ||
    activeTab === 'recently-played';

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleGlobalDrop}
      className="flex flex-col h-screen w-screen overflow-hidden bg-dark-950 text-dark-100 font-sans relative"
    >
      {/* Global Drag & Drop Overlay */}
      {isDraggingFiles && (
        <div className="absolute inset-0 z-50 bg-dark-950/85 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none border-2 border-aura-500/80 border-dashed m-3 rounded-2xl animate-in fade-in duration-200">
          <div className="w-20 h-20 rounded-full bg-aura-500/20 border border-aura-400/40 flex items-center justify-center text-aura-400 mb-4 shadow-lg shadow-aura-500/10 animate-bounce">
            <UploadCloud className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Drop Music Files or Folders Here</h3>
          <p className="text-sm text-dark-300 max-w-md text-center">
            Add MP3, FLAC, WAV, M4A, AAC, OGG songs or complete folders directly to your Aura music library
          </p>
        </div>
      )}

      {/* Global Import Notification Toast */}
      {importNotification && (
        <div className="absolute top-16 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-top duration-300 transition-all bg-dark-900/95 border-dark-700">
          {importNotification.status === 'importing' && (
            <RefreshCw className="w-5 h-5 text-aura-400 animate-spin" />
          )}
          {importNotification.status === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          {importNotification.status === 'error' && (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span className="text-sm text-dark-100 font-medium">
            {importNotification.message}
          </span>
          <button
            onClick={() => setImportNotification(null)}
            className="text-dark-400 hover:text-dark-200 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Application Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => {
          setSearchQuery('');
          setSelectedAlbumFilter(null);
        }}
        onOpenAddFolder={() => setIsAddFolderModalOpen(true)}
        showSampleData={showSampleData}
        onToggleSampleData={handleToggleSampleData}
        onRefresh={loadStoredLibrary}
        activeTabTitle={activeTabTitles[activeTab]}
      />

      {/* Main Body: Left Sidebar + Center Content Area + Right Panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 1. Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setSelectedAlbumFilter(null);
            setSelectedPlaylist(null);
            setActiveTab(tab);
          }}
          playlists={playlists}
          favoriteCount={favoriteCount}
          totalTrackCount={activeTracksPool.length}
          isPhoneConnected={SAMPLE_PHONE_DEVICE.isConnected}
          onOpenAddFolder={() => setIsAddFolderModalOpen(true)}
          onFocusSearch={() => {
            searchInputRef.current?.focus();
            setActiveTab('search');
          }}
        />

        {/* 2. Main Music Library Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-dark-950 overflow-hidden relative">
          {/* Library Tabs (Albums, Artists, Tracks, Recently Played) */}
          {isLibraryTab && (
            <LibraryTabs
              activeTab={activeTab}
              onTabChange={(tab) => {
                setSelectedAlbumFilter(null);
                setActiveTab(tab);
              }}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortField={sortField}
              onSortFieldChange={setSortField}
              sortOrder={sortOrder}
              onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              totalTracks={activeTracksPool.length}
              totalAlbums={derivedAlbums.length}
              totalArtists={derivedArtists.length}
            />
          )}

          {/* Dynamic Content Views */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === 'phone-sync' ? (
              <PhoneSyncView
                device={SAMPLE_PHONE_DEVICE}
                onRefreshSync={loadStoredLibrary}
                onSyncComplete={loadStoredLibrary}
              />
            ) : activeTracksPool.length === 0 ? (
              /* Empty-State Library View */
              <EmptyLibraryState
                onOpenAddFolder={() => setIsAddFolderModalOpen(true)}
                onSelectTab={() => setActiveTab('phone-sync')}
              />
            ) : activeTab === 'albums' || viewMode === 'grid' ? (
              /* Album / Grid View */
              <TrackGridView
                albums={derivedAlbums}
                onSelectAlbum={(alb: Album) => {
                  setSelectedAlbumFilter(alb.title);
                  setActiveTab('all-tracks');
                }}
              />
            ) : (
              /* Track List / Compact Table View */
              <TrackListView
                tracks={displayedTracks}
                currentTrackId={audioEngine.currentTrack?.id}
                isPlaying={audioEngine.isPlaying}
                onPlayTrack={(track) => audioEngine.playTrack(track, displayedTracks)}
                onToggleFavorite={handleToggleFavorite}
                onDeleteTrack={handleRequestDelete}
                viewMode={viewMode}
              />
            )}
          </div>
        </main>

        {/* 3. Right "Now Playing" Panel */}
        <NowPlayingPanel
          currentTrack={audioEngine.currentTrack}
          queue={audioEngine.queue}
          isOpen={isRightPanelOpen}
          onClose={() => setIsRightPanelOpen(false)}
          onPlayTrack={(track) => audioEngine.playTrack(track)}
          onRemoveFromQueue={(id) => audioEngine.setQueue((prev) => prev.filter((t) => t.id !== id))}
          onClearQueue={() => audioEngine.setQueue([])}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>

      {/* 4. Bottom Player Controls Deck */}
      <PlayerBar
        currentTrack={audioEngine.currentTrack}
        isPlaying={audioEngine.isPlaying}
        onTogglePlay={audioEngine.togglePlay}
        onNext={audioEngine.nextTrack}
        onPrevious={audioEngine.prevTrack}
        currentTime={audioEngine.currentTime}
        duration={audioEngine.duration}
        onSeek={audioEngine.seek}
        volume={audioEngine.volume}
        onVolumeChange={audioEngine.setVolume}
        isMuted={audioEngine.isMuted}
        onToggleMute={audioEngine.toggleMute}
        isShuffled={audioEngine.isShuffled}
        onToggleShuffle={audioEngine.toggleShuffle}
        repeatMode={audioEngine.repeatMode}
        onCycleRepeat={audioEngine.cycleRepeat}
        onToggleFavorite={handleToggleFavorite}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
        playbackSpeed={audioEngine.playbackSpeed}
        onChangePlaybackSpeed={audioEngine.setPlaybackSpeed}
      />

      {/* Modals */}
      <AddFolderModal
        isOpen={isAddFolderModalOpen}
        onClose={() => setIsAddFolderModalOpen(false)}
        onScanComplete={handleScanComplete}
      />

      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreatePlaylist={handleCreatePlaylist}
      />

      <DeleteTrackModal
        isOpen={trackToDelete !== null}
        track={trackToDelete}
        isManagedFile={trackToDelete ? isAuraManagedTrack(trackToDelete) : false}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setTrackToDelete(null)}
      />
    </div>
  );
};

export default App;
