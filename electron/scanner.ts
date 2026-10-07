import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import * as mm from 'music-metadata';
import { getArtworkDir } from './storage';
import { buildMediaUrl } from './mediaUrl';

export interface ScannedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl?: string; // aura-media:// URL pointing at the cached artwork file
  bitrate?: string;
  format: 'FLAC' | 'MP3' | 'WAV' | 'AAC' | 'OGG' | 'ALAC';
  year?: number;
  genre?: string;
  isFavorite?: boolean;
  filePath: string;
  fileName: string;
  fileSize: number;
  dateAdded: string;
  trackNumber?: number;
}

export interface ScanProgress {
  currentFile: string;
  scannedCount: number;
  totalFiles: number;
  percent: number;
}

export const SUPPORTED_EXTENSIONS = new Set([
  '.mp3',
  '.flac',
  '.wav',
  '.m4a',
  '.ogg',
  '.aac',
  '.alac',
  '.opus',
]);

export async function findAudioFiles(dirPath: string): Promise<string[]> {
  const audioFiles: string[] = [];

  async function walk(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        if (entry.isDirectory()) {
          // Ignore hidden or system directories
          if (!entry.name.startsWith('.') && entry.name !== '$RECYCLE.BIN' && entry.name !== 'System Volume Information') {
            await walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (SUPPORTED_EXTENSIONS.has(ext)) {
            audioFiles.push(fullPath);
          }
        }
      }
    } catch (err) {
      console.warn(`[Scanner] Skipping inaccessible folder: ${currentDir}`, err);
    }
  }

  await walk(dirPath);
  return audioFiles;
}

function getAudioFormat(ext: string): 'FLAC' | 'MP3' | 'WAV' | 'AAC' | 'OGG' | 'ALAC' {
  switch (ext.toLowerCase()) {
    case '.flac':
      return 'FLAC';
    case '.wav':
      return 'WAV';
    case '.m4a':
    case '.aac':
      return 'AAC';
    case '.ogg':
    case '.opus':
      return 'OGG';
    default:
      return 'MP3';
  }
}

export async function parseAudioMetadata(filePath: string): Promise<ScannedTrack> {
  const stats = await fs.stat(filePath);
  const ext = extname(filePath).toLowerCase();
  const rawFileName = basename(filePath, ext);

  let title = rawFileName;
  let artist = 'Unknown Artist';
  let album = 'Unknown Album';
  let duration = 0;
  let coverUrl: string | undefined = undefined;
  let bitrateStr: string | undefined = undefined;
  let year: number | undefined = undefined;
  let genre: string | undefined = undefined;
  let trackNumber: number | undefined = undefined;

  try {
    const metadata = await mm.parseFile(filePath, { duration: true, skipCovers: false });
    const common = metadata.common;
    const format = metadata.format;

    if (common.title && common.title.trim()) {
      title = common.title.trim();
    }
    if (common.artist && common.artist.trim()) {
      artist = common.artist.trim();
    } else if (common.albumartist && common.albumartist.trim()) {
      artist = common.albumartist.trim();
    }
    if (common.album && common.album.trim()) {
      album = common.album.trim();
    }
    if (common.year) {
      year = common.year;
    }
    if (common.genre && common.genre.length > 0) {
      genre = common.genre[0];
    }
    if (common.track && common.track.no) {
      trackNumber = common.track.no;
    }
    if (format.duration) {
      duration = Math.round(format.duration);
    }

    // Format bitrate / quality description
    if (format.bitrate) {
      const kbps = Math.round(format.bitrate / 1000);
      const sampleRateKHz = format.sampleRate ? `${(format.sampleRate / 1000).toFixed(1)}kHz` : '';
      const bits = format.bitsPerSample ? `${format.bitsPerSample}-bit` : '';
      bitrateStr = [bits, sampleRateKHz, `${kbps} kbps`].filter(Boolean).join(' • ');
    }

    // Extract and cache cover artwork if available
    if (common.picture && common.picture.length > 0) {
      try {
        const pic = common.picture[0];
        const mime = pic.format || 'image/jpeg';
        const ext = mime.toLowerCase().includes('png') ? 'png' : 'jpg';
        const buffer = Buffer.from(pic.data);
        const hash = require('crypto').createHash('md5').update(buffer).digest('hex');
        const artDir = getArtworkDir();
        const artFilePath = join(artDir, `${hash}.${ext}`);
        if (!require('fs').existsSync(artFilePath)) {
          await fs.writeFile(artFilePath, buffer);
        }
        coverUrl = buildMediaUrl(artFilePath);
      } catch (artErr) {
        console.warn(`[Scanner] Artwork disk caching fallback for ${filePath}:`, artErr);
      }
    }
  } catch (parseErr) {
    console.warn(`[Scanner] Metadata parsing fallback for ${filePath}:`, parseErr);
  }

  // Generate deterministic ID from file path
  const id = Buffer.from(filePath).toString('base64url');

  return {
    id,
    title,
    artist,
    album,
    duration,
    coverUrl,
    bitrate: bitrateStr,
    format: getAudioFormat(ext),
    year,
    genre,
    isFavorite: false,
    filePath,
    fileName: basename(filePath),
    fileSize: stats.size,
    dateAdded: stats.mtime.toISOString().split('T')[0],
    trackNumber,
  };
}

