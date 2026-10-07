import { app, BrowserWindow, ipcMain, dialog, shell, protocol } from 'electron';
import { promises as fs, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { findAudioFiles, parseAudioMetadata, ScannedTrack, SUPPORTED_EXTENSIONS } from './scanner';
import { auraMediaHandler } from './mediaProtocol';
import { extractMediaPath } from './mediaUrl';
import { loadLibraryState, saveLibraryState, getArtworkDir, upsertTrack, pruneStaleSongs, LibraryState } from './storage';
import {
  scanUsbPhoneFolder,
  transferUsbTracks,
  getPhoneSyncDir,
  listConnectedMtpDevices,
  getDeviceFolders,
  scanMtpDevice,
  copyMtpTracks,
} from './usbSync';

let mainWindow: BrowserWindow | null = null;

// Register custom standard protocol scheme for audio before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'aura-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || (app ? !app.isPackaged : true);
}

function createWindow() {
  const iconPath = join(__dirname, '../build/icon.png');
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1040,
    minHeight: 680,
    title: 'Aura',
    icon: iconPath,
    backgroundColor: '#07080d',
    show: false,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDevelopment()) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Serve local audio files & cached artwork through a canonicalization-safe
  // custom protocol with Range support (see mediaUrl.ts for the URL format).
  protocol.handle('aura-media', auraMediaHandler);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ---- IPC Handlers for Library Scanning, Audio & Storage ----

/** Removes any references to the given song ids (favorites/recent/playlists). */
function scrubSongIds(state: LibraryState, prunedIds: string[]): void {
  if (!prunedIds.length) return;
  const pruned = new Set(prunedIds);
  state.favorites = (state.favorites || []).filter((id) => !pruned.has(id));
  state.recentlyPlayed = (state.recentlyPlayed || []).filter((id) => !pruned.has(id));
  state.playlists = (state.playlists || []).map((pl) => ({
    ...pl,
    songIds: (pl.songIds || []).filter((id) => !pruned.has(id)),
  }));
}

ipcMain.handle('app:get-version', () => app.getVersion());

ipcMain.handle('app:get-default-music-dir', () => {
  try {
    return app.getPath('music');
  } catch {
    return 'C:\\Music';
  }
});

ipcMain.handle('app:open-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Music Folder',
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('app:show-item-in-folder', async (_event, filePath: string) => {
  if (filePath) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('app:open-external', async (_event, url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('library:get-state', async () => {
  return loadLibraryState();
});

/**
 * Merges partial renderer state over the freshest persisted state.
 *
 * The renderer does not know about `folders` or playlist `songIds` (they are
 * intentionally not hydrated into React), so writing its state back verbatim
 * used to wipe those fields. Merging keeps those records intact while letting
 * the renderer own songs / favorites / playlists content.
 */
ipcMain.handle('library:save-state', async (_event, state: LibraryState) => {
  try {
    const current = await loadLibraryState();
    const incoming = (state || {}) as Partial<LibraryState> & LibraryState;

    const folders = Array.from(
      new Set([...(current.folders || []), ...(Array.isArray(incoming.folders) ? incoming.folders : [])])
    );

    const incomingPlaylists = Array.isArray(incoming.playlists) && incoming.playlists.length > 0
      ? incoming.playlists
      : current.playlists;
    const playlists = incomingPlaylists.map((pl) => {
      const existing = current.playlists.find((p) => p.id === pl.id);
      return {
        ...pl,
        songIds: Array.isArray(pl.songIds) && pl.songIds.length > 0
          ? pl.songIds
          : (existing?.songIds || []),
      };
    });

    const recent = Array.from(
      new Set([
        ...(Array.isArray(incoming.recentlyPlayed) ? incoming.recentlyPlayed : []),
        ...(current.recentlyPlayed || []),
      ])
    ).slice(0, 50);

    const merged: LibraryState = {
      ...current,
      ...incoming,
      folders,
      playlists,
      recentlyPlayed: recent,
      songs: Array.isArray(incoming.songs) ? incoming.songs : current.songs,
      favorites: Array.isArray(incoming.favorites) ? incoming.favorites : current.favorites,
    };

    return await saveLibraryState(merged);
  } catch (err) {
    console.error('[Library] save-state merge failed, falling back to direct write:', err);
    return saveLibraryState(state);
  }
});

/**
 * Removes a song from the library and cleans up everything related to it:
 *  - the library JSON record
 *  - favorites / recently-played / playlist references (song ids)
 *  - the PC-local copied file, when it lives in Aura-managed storage
 *    (e.g. Music\Aura\Phone Sync) — never the user's own files elsewhere
 *  - the cached artwork file, only when no other song references it
 *
 * Re-importing the same song afterwards therefore starts from a clean slate.
 */
ipcMain.handle('library:delete-song', async (_event, songId: string) => {
  try {
    if (!songId || typeof songId !== 'string') {
      return { success: false, message: 'No song id provided' };
    }

    const state = await loadLibraryState();
    const idx = state.songs.findIndex((s) => s.id === songId);
    if (idx < 0) {
      return { success: false, message: 'Song not found in library' };
    }
    const song = state.songs[idx];
    state.songs.splice(idx, 1);

    // Scrub every reference to the deleted song id
    state.favorites = (state.favorites || []).filter((id) => id !== song.id);
    state.recentlyPlayed = (state.recentlyPlayed || []).filter((id) => id !== song.id);
    state.playlists = (state.playlists || []).map((pl) => ({
      ...pl,
      songIds: (pl.songIds || []).filter((id) => id !== song.id),
    }));

    // Delete the local copied file only when it is inside Aura-managed storage
    let fileDeleted = false;
    let fileDeleteError: string | undefined;
    if (song.filePath) {
      const managedDir = getPhoneSyncDir().replace(/[\\/]+$/, '').toLowerCase();
      const normalized = song.filePath.replace(/\//g, '\\');
      const isManaged =
        normalized.replace(/[\\/]+$/, '').toLowerCase() === managedDir ||
        normalized.toLowerCase().startsWith(managedDir + '\\');
      if (isManaged) {
        try {
          await fs.unlink(song.filePath);
          fileDeleted = true;
        } catch (err: any) {
          if (err?.code === 'ENOENT') {
            fileDeleted = true; // already gone — nothing stale left behind
          } else {
            fileDeleteError = err?.message || String(err);
            console.warn('[Delete] Could not delete local file:', song.filePath, err);
          }
        }
      }
    }

    // Artwork cache is content-addressed and may be shared between songs
    // (same album art). Only remove it when no remaining song uses it.
    if (song.coverUrl) {
      try {
        const artPath = extractMediaPath(song.coverUrl);
        if (artPath) {
          const artDirPrefix = getArtworkDir().replace(/[\\/]+$/, '').toLowerCase();
          const normalizedArt = artPath.replace(/\//g, '\\').toLowerCase();
          const stillReferenced = state.songs.some((s) => {
            if (!s.coverUrl) return false;
            const p = extractMediaPath(s.coverUrl);
            return !!p && p.replace(/\//g, '\\').toLowerCase() === normalizedArt;
          });
          if (
            !stillReferenced &&
            normalizedArt.startsWith(artDirPrefix + '\\') &&
            existsSync(artPath)
          ) {
            await fs.unlink(artPath);
          }
        }
      } catch (err) {
        console.warn('[Delete] Artwork cache cleanup failed (non-fatal):', err);
      }
    }

    await saveLibraryState(state);
    console.log(
      `[Delete] Removed "${song.title}" id=${song.id} fileDeleted=${fileDeleted} path=${song.filePath}`
    );
    return { success: true, song, fileDeleted, fileDeleteError, library: state };
  } catch (err: any) {
    console.error('[Delete] Failed to delete song:', err);
    return { success: false, message: err?.message || 'Failed to delete song' };
  }
});

ipcMain.handle('library:scan-folder', async (event, folderPath: string) => {
  if (!folderPath) return { success: false, songs: [], message: 'No folder provided' };

  try {
    const audioFilePaths = await findAudioFiles(folderPath);
    const totalFiles = audioFilePaths.length;
    const scannedTracks: ScannedTrack[] = [];

    for (let i = 0; i < totalFiles; i++) {
      const filePath = audioFilePaths[i];
      try {
        const track = await parseAudioMetadata(filePath);
        scannedTracks.push(track);
      } catch (err) {
        console.warn(`[Scan] Failed to parse metadata for ${filePath}`, err);
      }

      if (i % 5 === 0 || i === totalFiles - 1) {
        const percent = Math.round(((i + 1) / totalFiles) * 100);
        event.sender.send('library:scan-progress', {
          currentFile: filePath,
          scannedCount: i + 1,
          totalFiles,
          percent,
        });
      }
    }

    const currentState = await loadLibraryState();
    const existingMap = new Map<string, ScannedTrack>();
    currentState.songs.forEach((s) => existingMap.set(s.filePath, s));

    scannedTracks.forEach((s) => {
      existingMap.set(s.filePath, s);
    });

    // Drop records pointing inside the rescanned folder whose files are gone,
    // so a song deleted outside Aura never lingers as a broken/stale entry.
    const pruned = pruneStaleSongs(Array.from(existingMap.values()), folderPath);
    const updatedState: LibraryState = {
      ...currentState,
      folders: Array.from(new Set([...currentState.folders, folderPath])),
      songs: pruned.songs,
      lastScannedAt: new Date().toISOString(),
    };
    if (pruned.prunedIds.length > 0) {
      scrubSongIds(updatedState, pruned.prunedIds);
      console.log(`[Scan] Pruned ${pruned.prunedIds.length} stale record(s) under ${folderPath}`);
    }

    await saveLibraryState(updatedState);

    return {
      success: true,
      newSongsCount: scannedTracks.length,
      totalSongsCount: updatedState.songs.length,
      prunedStaleCount: pruned.prunedIds.length,
      library: updatedState,
    };
  } catch (err: any) {
    console.error('[Scan] Error scanning folder:', err);
    return { success: false, songs: [], message: err.message || 'Unknown scan error' };
  }
});

ipcMain.handle('library:import-dropped-paths', async (_event, paths: string[]) => {
  if (!paths || paths.length === 0) {
    return { success: false, importedCount: 0, message: 'No paths provided' };
  }

  try {
    const audioFilesToImport: string[] = [];
    const parentFolders = new Set<string>();

    for (const p of paths) {
      if (!p) continue;
      try {
        const stats = await fs.stat(p);
        if (stats.isDirectory()) {
          const files = await findAudioFiles(p);
          audioFilesToImport.push(...files);
          parentFolders.add(p);
        } else if (stats.isFile()) {
          const ext = extname(p).toLowerCase();
          if (SUPPORTED_EXTENSIONS.has(ext)) {
            audioFilesToImport.push(p);
            parentFolders.add(dirname(p));
          }
        }
      } catch (err) {
        console.warn(`[Drop Import] Could not inspect path ${p}:`, err);
      }
    }

    if (audioFilesToImport.length === 0) {
      return { success: true, importedCount: 0, message: 'No supported audio files found' };
    }

    const uniqueFiles = Array.from(new Set(audioFilesToImport));
    const currentState = await loadLibraryState();
    const existingMap = new Map<string, ScannedTrack>();
    currentState.songs.forEach((s) => existingMap.set(s.filePath, s));

    let importedCount = 0;
    for (let i = 0; i < uniqueFiles.length; i++) {
      const filePath = uniqueFiles[i];
      try {
        const track = await parseAudioMetadata(filePath);
        existingMap.set(track.filePath, track);
        importedCount++;
        if (mainWindow) {
          mainWindow.webContents.send('sync:track-received', track);
        }
      } catch (err) {
        console.warn(`[Drop Import] Could not parse metadata for ${filePath}:`, err);
      }
    }

    const folders = Array.from(new Set([...currentState.folders, ...parentFolders]));
    // Remove dead entries superseded by these fresh copies (stale paths)
    const pruned = pruneStaleSongs(Array.from(existingMap.values()));
    const updatedState: LibraryState = {
      ...currentState,
      folders,
      songs: pruned.songs,
      lastScannedAt: new Date().toISOString(),
    };
    if (pruned.prunedIds.length > 0) {
      scrubSongIds(updatedState, pruned.prunedIds);
    }

    await saveLibraryState(updatedState);

    return {
      success: true,
      importedCount,
      totalSongsCount: updatedState.songs.length,
      library: updatedState,
    };
  } catch (err: any) {
    console.error('[Drop Import] Error importing paths:', err);
    return { success: false, importedCount: 0, message: err.message };
  }
});

ipcMain.handle('library:import-binary-file', async (_event, fileName: string, buffer: ArrayBuffer) => {
  if (!fileName || !buffer) {
    return { success: false, message: 'Invalid file or empty buffer' };
  }

  try {
    const targetDir = getPhoneSyncDir();
    await fs.mkdir(targetDir, { recursive: true });

    const safeName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
    const targetPath = join(targetDir, safeName);

    await fs.writeFile(targetPath, Buffer.from(buffer));
    const track = await parseAudioMetadata(targetPath);

    const currentState = await loadLibraryState();
    upsertTrack(currentState, track);

    if (!currentState.folders.includes(targetDir)) {
      currentState.folders.push(targetDir);
    }

    await saveLibraryState(currentState);

    if (mainWindow) {
      mainWindow.webContents.send('sync:track-received', track);
    }

    return { success: true, track, library: currentState };
  } catch (err: any) {
    console.error('[Binary Import] Error saving binary file:', err);
    return { success: false, message: err.message };
  }
});

// ---- USB & MTP Phone Sync IPC Handlers ----

ipcMain.handle('usb:list-devices', async () => {
  return await listConnectedMtpDevices();
});

ipcMain.handle('usb:get-device-folders', async (_event, deviceName: string, subfolder?: string) => {
  return await getDeviceFolders(deviceName, subfolder || '');
});

ipcMain.handle('usb:scan-mtp', async (_event, deviceName: string) => {
  return await scanMtpDevice(deviceName);
});

ipcMain.handle('usb:copy-mtp', async (_event, deviceName: string, trackNames: string[]) => {
  return await copyMtpTracks(deviceName, trackNames, mainWindow);
});

ipcMain.handle('usb:open-this-pc', async () => {
  await shell.openExternal('shell:MyComputerFolder');
  return true;
});

ipcMain.handle('usb:select-phone-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Connected Phone / USB Music Folder',
    buttonLabel: 'Select Folder',
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('usb:get-target-dir', () => {
  return getPhoneSyncDir();
});

ipcMain.handle('usb:scan-phone', async (_event, folderPath: string) => {
  try {
    return await scanUsbPhoneFolder(folderPath);
  } catch (err: any) {
    console.error('[USB Sync] Error scanning phone folder:', err);
    throw err;
  }
});

ipcMain.handle('usb:transfer-tracks', async (_event, tracksToCopy: { sourcePath: string; fileName: string }[]) => {
  try {
    return await transferUsbTracks(tracksToCopy, mainWindow);
  } catch (err: any) {
    console.error('[USB Sync] Error transferring tracks:', err);
    throw err;
  }
});
