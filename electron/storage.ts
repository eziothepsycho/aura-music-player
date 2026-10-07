import { app } from 'electron';
import { join, basename } from 'path';
import { promises as fs, existsSync, mkdirSync, copyFileSync, statSync } from 'fs';
import * as crypto from 'crypto';
import { ScannedTrack } from './scanner';
import { buildMediaUrl, extractMediaPath } from './mediaUrl';

export interface PlaylistData {
  id: string;
  name: string;
  description?: string;
  songIds: string[];
}

export interface LibraryState {
  folders: string[];
  songs: ScannedTrack[];
  favorites: string[]; // song ids
  recentlyPlayed: string[]; // song ids
  playlists: PlaylistData[];
  lastScannedAt?: string;
}

const DEFAULT_LIBRARY_STATE: LibraryState = {
  folders: [],
  songs: [],
  favorites: [],
  recentlyPlayed: [],
  playlists: [
    { id: 'pl-1', name: 'My Top Tracks', songIds: [] },
    { id: 'pl-2', name: 'Chill Vibes', songIds: [] },
  ],
};

export function getArtworkDir(): string {
  try {
    const dir = join(app.getPath('userData'), 'artwork');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    const appData = process.env.APPDATA;
    const base = appData ? join(appData, 'aura') : process.cwd();
    const dir = join(base, 'artwork');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }
}

function getStoragePath(): string {
  try {
    return join(app.getPath('userData'), 'aura_library.json');
  } catch {
    const appData = process.env.APPDATA;
    if (appData) {
      return join(appData, 'aura', 'aura_library.json');
    }
    return join(process.cwd(), 'aura_library.json');
  }
}

/**
 * Normalizes artwork references when loading/saving the library:
 * 1. Extracts any inlined Base64 artwork to external cached disk files,
 *    keeping the JSON storage file tiny (<400KB instead of 85MB+).
 * 2. Rewrites legacy `aura-media:///C:/...` cover URLs (which Chromium
 *    canonicalizes into a broken host and can never load) to the
 *    canonicalization-safe `aura-media://local/?path=...` format.
 * 3. Drops references to artwork files that no longer exist on disk.
 */
export async function migrateArtworkToDisk(songs: ScannedTrack[]): Promise<boolean> {
  const artDir = getArtworkDir();
  let migratedAny = false;

  for (const song of songs) {
    if (!song.coverUrl) continue;

    if (song.coverUrl.startsWith('data:image')) {
      try {
        const match = song.coverUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (match) {
          const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
          const buffer = Buffer.from(match[2], 'base64');
          const hash = crypto.createHash('md5').update(buffer).digest('hex');
          const artPath = join(artDir, `${hash}.${ext}`);
          if (!existsSync(artPath)) {
            await fs.writeFile(artPath, buffer);
          }
          song.coverUrl = buildMediaUrl(artPath);
          migratedAny = true;
        }
      } catch (err) {
        console.warn(`[Storage] Failed to extract artwork for ${song.title}:`, err);
      }
    } else if (song.coverUrl.startsWith('aura-media:')) {
      const artPath = extractMediaPath(song.coverUrl);
      const normalized = artPath ? buildMediaUrl(artPath) : undefined;
      if (normalized !== song.coverUrl) {
        song.coverUrl = normalized;
        migratedAny = true;
      }
      if (normalized && !existsSync(artPath!)) {
        // Artwork cache file was removed — clear so the UI falls back cleanly
        song.coverUrl = undefined;
        migratedAny = true;
      }
    }
  }

  return migratedAny;
}

/**
 * Validates, repairs, and sanitizes track objects loaded from disk
 */
function sanitizeLoadedSongs(rawSongs: unknown[]): ScannedTrack[] {
  if (!Array.isArray(rawSongs)) return [];
  const clean: ScannedTrack[] = [];

  for (let i = 0; i < rawSongs.length; i++) {
    const s = rawSongs[i] as any;
    if (!s || typeof s !== 'object') continue;

    // Must have at least a valid filePath or id to be a usable track
    if (!s.filePath && !s.id) continue;

    clean.push({
      id: typeof s.id === 'string' && s.id ? s.id : `track-${i}-${Date.now()}`,
      title: typeof s.title === 'string' && s.title ? s.title : (typeof s.fileName === 'string' ? s.fileName : 'Unknown Title'),
      artist: typeof s.artist === 'string' && s.artist ? s.artist : 'Unknown Artist',
      album: typeof s.album === 'string' && s.album ? s.album : 'Unknown Album',
      duration: typeof s.duration === 'number' && !isNaN(s.duration) ? s.duration : 0,
      format: s.format || 'MP3',
      bitrate: typeof s.bitrate === 'string' ? s.bitrate : undefined,
      coverUrl: typeof s.coverUrl === 'string' ? s.coverUrl : undefined,
      year: typeof s.year === 'number' && !isNaN(s.year) ? s.year : undefined,
      genre: typeof s.genre === 'string' ? s.genre : undefined,
      isFavorite: !!s.isFavorite,
      filePath: typeof s.filePath === 'string' ? s.filePath : '',
      // fileName is always derived from filePath when possible — the renderer
      // historically dropped this field on save, writing 'track.mp3' garbage.
      fileName: typeof s.filePath === 'string' && s.filePath
        ? basename(s.filePath)
        : (typeof s.fileName === 'string' && s.fileName ? s.fileName : 'track.mp3'),
      fileSize: typeof s.fileSize === 'number' && s.fileSize > 0
        ? s.fileSize
        : (s.filePath && existsSync(s.filePath) ? statSync(s.filePath).size : 0),
      dateAdded: typeof s.dateAdded === 'string' ? s.dateAdded : new Date().toISOString().split('T')[0],
      trackNumber: typeof s.trackNumber === 'number' ? s.trackNumber : undefined,
    });
  }

  return clean;
}

export async function loadLibraryState(): Promise<LibraryState> {
  const filePath = getStoragePath();
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);

    const songs = sanitizeLoadedSongs(parsed.songs);
    const migrated = await migrateArtworkToDisk(songs);

    const state: LibraryState = {
      ...DEFAULT_LIBRARY_STATE,
      ...parsed,
      songs,
      playlists: Array.isArray(parsed.playlists) && parsed.playlists.length ? parsed.playlists : DEFAULT_LIBRARY_STATE.playlists,
    };

    // If we pruned base64 data URLs, persist the optimized slim JSON immediately
    if (migrated) {
      await saveLibraryState(state);
    }

    return state;
  } catch (err: any) {
    if (err && err.code !== 'ENOENT') {
      console.error('[Storage] Error loading aura_library.json:', err);
      // Backup corrupted file for diagnostics
      try {
        const backupPath = filePath.replace(/\.json$/, `.corrupt.${Date.now()}.json`);
        copyFileSync(filePath, backupPath);
        console.warn(`[Storage] Saved corrupt library backup to: ${backupPath}`);
      } catch {}
    }
    return { ...DEFAULT_LIBRARY_STATE };
  }
}

/**
 * Adds or replaces a track without leaving stale duplicates behind:
 * - A record with the same filePath is replaced in place (fresh metadata,
 *   fresh artwork reference — used when a song is re-imported).
 * - A *different* record with the same file name whose local file no longer
 *   exists is dropped — it is a dead entry superseded by this new copy.
 * - Records whose local files still exist are never removed here (duplicate
 *   prevention happens during scanning).
 */
export function upsertTrack(library: LibraryState, parsed: ScannedTrack): void {
  const newBase = (parsed.fileName || basename(parsed.filePath || '')).toLowerCase();
  const kept: ScannedTrack[] = [];
  let replaced = false;

  for (const s of library.songs) {
    if (s.filePath && s.filePath === parsed.filePath) {
      if (!replaced) {
        kept.push(parsed);
        replaced = true;
      }
      continue; // collapse accidental duplicate paths
    }
    const existingBase = basename(s.filePath || '').toLowerCase();
    if (newBase && existingBase === newBase && !existsSync(s.filePath || '')) {
      continue; // stale record (file gone) superseded by this import
    }
    kept.push(s);
  }

  if (!replaced) {
    kept.unshift(parsed);
  }
  library.songs = kept;
}

/**
 * Removes dead library entries so stale data never survives a delete:
 * - If `rootFolder` is provided, every record pointing inside that folder
 *   whose file no longer exists is dropped (the caller just rescanned it).
 * - Any record whose file is missing while another record with the SAME file
 *   name exists on disk is dropped (superseded duplicate).
 * Records whose files still exist are always kept.
 * Returns the surviving songs plus the pruned ids so callers can scrub
 * favorites / recently-played / playlist references.
 */
export function pruneStaleSongs(
  songs: ScannedTrack[],
  rootFolder?: string
): { songs: ScannedTrack[]; prunedIds: string[] } {
  const folderNorm = rootFolder
    ? rootFolder.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase()
    : '';
  const aliveNames = new Set<string>();
  for (const s of songs) {
    if (s.filePath && existsSync(s.filePath)) {
      aliveNames.add(basename(s.filePath).toLowerCase());
    }
  }

  const kept: ScannedTrack[] = [];
  const prunedIds: string[] = [];
  for (const s of songs) {
    const p = (s.filePath || '').replace(/\//g, '\\');
    if (s.filePath && existsSync(s.filePath)) {
      kept.push(s);
      continue;
    }
    const lower = p.toLowerCase();
    const inRescannedFolder =
      !!folderNorm && (lower === folderNorm || lower.startsWith(folderNorm + '\\'));
    const supersededByLiveCopy = aliveNames.has(basename(p).toLowerCase());
    if (inRescannedFolder || supersededByLiveCopy) {
      prunedIds.push(s.id);
      continue;
    }
    kept.push(s);
  }
  return { songs: kept, prunedIds };
}

export async function saveLibraryState(state: LibraryState): Promise<boolean> {
  const filePath = getStoragePath();
  const tempPath = `${filePath}.tmp`;

  try {
    // Ensure artwork is moved out of JSON before writing to disk
    if (Array.isArray(state.songs)) {
      await migrateArtworkToDisk(state.songs);
    }

    const payload = JSON.stringify(state, null, 2);
    // Atomic write via temp file
    await fs.writeFile(tempPath, payload, 'utf-8');
    await fs.rename(tempPath, filePath);
    return true;
  } catch (err) {
    console.error('[Storage] Failed to save library state:', err);
    try {
      if (existsSync(tempPath)) await fs.unlink(tempPath);
    } catch {}
    return false;
  }
}
