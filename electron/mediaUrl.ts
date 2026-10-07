/**
 * Shared helpers for Aura's custom `aura-media://` protocol.
 *
 * IMPORTANT — why the URL format looks like this:
 * `aura-media:///C:/Music/song.mp3` is NOT safe. Chromium canonicalizes
 * standard-scheme URLs and rewrites `///C:` into `//c:` — the drive letter
 * becomes the lowercased *host* (`c`) and is dropped from the path, so the
 * main-process handler receives `aura-media://c/Users/...` and resolves a
 * nonexistent relative path. Every audio and artwork request 404s.
 *
 * The canonicalization-safe form keeps a fixed host and puts the fully
 * percent-encoded native path in the query string, which the URL parser
 * preserves verbatim:
 *
 *   aura-media://local/?path=C%3A%5CUsers%5C...%5Csong.mp3
 */

export const MEDIA_SCHEME = 'aura-media';
export const MEDIA_HOST = 'local';

const PASSTHROUGH_PREFIXES = /^(https?:|blob:|data:)/i;

/**
 * Builds a canonicalization-safe media URL for a local file path
 * (or passes through http/https/blob/data URLs untouched).
 */
export function buildMediaUrl(filePath: string): string {
  if (!filePath) return '';
  if (PASSTHROUGH_PREFIXES.test(filePath)) return filePath;
  return `${MEDIA_SCHEME}://${MEDIA_HOST}/?path=${encodeURIComponent(filePath)}`;
}

/**
 * Extracts the native file path from a `aura-media://` request URL.
 * Supports the current query format plus legacy `aura-media:///C:/...`
 * strings (as stored in older library files, before browser canonicalization)
 * and drive-letter URLs already mangled by Chromium (`aura-media://c/...`).
 * Returns null when no path can be recovered.
 */
export function extractMediaPath(requestUrl: string): string | null {
  if (!requestUrl) return null;
  try {
    const lower = requestUrl.toLowerCase();
    if (!lower.startsWith(`${MEDIA_SCHEME}:`)) return null;

    // Current format: aura-media://local/?path=<encodeURIComponent(nativePath)>
    const queryIndex = requestUrl.indexOf('?');
    if (queryIndex !== -1) {
      const query = requestUrl.slice(queryIndex + 1);
      if (query.toLowerCase().startsWith('path=')) {
        try {
          const decoded = decodeURIComponent(query.slice('path='.length));
          return decoded || null;
        } catch {
          return query.slice('path='.length) || null;
        }
      }
    }

    // Legacy raw form: aura-media:///C:/Users/... (triple slash, unencoded —
    // this is what old library JSON contains before migration).
    const rest = requestUrl.slice(requestUrl.indexOf('://') + 3);

    // aura-media:///C:/Users/... (raw, unencoded)
    if (/^\/[a-zA-Z]:/.test(rest)) {
      return tryDecode(rest.slice(1));
    }
    // aura-media://C:/Users/... (raw, unencoded, no leading slash)
    if (/^[a-zA-Z]:\//.test(rest)) {
      return tryDecode(rest);
    }
    // Legacy form already canonicalized by Chromium: the drive letter became
    // the host (aura-media://c/Users/...). Host is a single letter — restore
    // it as the drive (Windows paths are case-insensitive).
    if (/^[a-zA-Z]\//.test(rest)) {
      return tryDecode(rest.replace('/', ':'));
    }
    // UNC-style legacy path: aura-media:////server/share/file
    if (/^\/\/[^/]/.test(rest)) {
      return tryDecode(rest);
    }

    return null;
  } catch {
    return null;
  }
}

function tryDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.aac': 'audio/aac',
  '.alac': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wma': 'audio/x-ms-wma',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

export function getMimeType(filePath: string): string {
  const dot = filePath.lastIndexOf('.');
  if (dot === -1) return 'application/octet-stream';
  const ext = filePath.slice(dot).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}
