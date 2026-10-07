import { promises as fs } from 'fs';
import { extractMediaPath, getMimeType } from './mediaUrl';

const CHUNK_SIZE = 64 * 1024;

/**
 * Streams a byte range of a local file without loading it all into memory.
 */
function createFileStream(filePath: string, start: number, end: number): ReadableStream<Uint8Array> {
  let handle: fs.FileHandle | null = null;
  let position = start;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (position > end) {
          if (handle) await handle.close();
          controller.close();
          return;
        }
        if (!handle) {
          handle = await fs.open(filePath, 'r');
        }
        const toRead = Math.min(CHUNK_SIZE, end - position + 1);
        const buffer = Buffer.alloc(toRead);
        await handle.read(buffer, 0, toRead, position);
        position += toRead;
        controller.enqueue(new Uint8Array(buffer));
        if (position > end) {
          await handle.close();
          handle = null;
          controller.close();
        }
      } catch (err) {
        if (handle) {
          try {
            await handle.close();
          } catch {}
          handle = null;
        }
        controller.error(err);
      }
    },
    async cancel() {
      if (handle) {
        try {
          await handle.close();
        } catch {}
        handle = null;
      }
    },
  });
}

interface ParsedRange {
  start: number;
  end: number;
}

function parseRangeHeader(header: string, size: number): ParsedRange | null | 'unsatisfiable' {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;

  if (rawStart === '') {
    // Suffix range: bytes=-N (last N bytes)
    if (rawEnd === '') return null;
    const suffixLength = parseInt(rawEnd, 10);
    if (isNaN(suffixLength) || suffixLength <= 0) return 'unsatisfiable';
    const start = Math.max(0, size - suffixLength);
    return { start, end: size - 1 };
  }

  const start = parseInt(rawStart, 10);
  if (isNaN(start) || start >= size) return 'unsatisfiable';
  let end = rawEnd === '' ? size - 1 : parseInt(rawEnd, 10);
  if (isNaN(end) || end >= size) end = size - 1;
  if (end < start) return 'unsatisfiable';
  return { start, end };
}

/**
 * Handler for Aura's `aura-media://` scheme — serves local audio files and
 * cached artwork with HTTP Range support (needed for seeking in media elements).
 */
export async function auraMediaHandler(request: Request): Promise<Response> {
  try {
    const filePath = extractMediaPath(request.url);
    if (!filePath) {
      console.warn(`[Protocol] Could not extract media path from: ${request.url}`);
      return new Response('Bad media path', { status: 400 });
    }

    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch {
      console.warn(`[Protocol] Media file not found: ${filePath}`);
      return new Response('File not found', { status: 404 });
    }
    if (!stats.isFile()) {
      return new Response('Not a file', { status: 404 });
    }

    const size = stats.size;
    const mimeType = getMimeType(filePath);
    const baseHeaders: Record<string, string> = {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      // Artwork files are content-addressed (md5 of their bytes) and can be
      // cached forever. Audio files are PATH-addressed and their content can
      // change (delete + re-import), so they must never be served stale.
      'Cache-Control': mimeType.startsWith('image/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    };

    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      const range = parseRangeHeader(rangeHeader, size);
      if (range === 'unsatisfiable') {
        return new Response(null, {
          status: 416,
          headers: { ...baseHeaders, 'Content-Range': `bytes */${size}` },
        });
      }
      if (range) {
        const { start, end } = range;
        const contentLength = end - start + 1;
        return new Response(createFileStream(filePath, start, end), {
          status: 206,
          headers: {
            ...baseHeaders,
            'Content-Length': String(contentLength),
            'Content-Range': `bytes ${start}-${end}/${size}`,
          },
        });
      }
    }

    // Full file (no or unparsable Range header)
    if (size === 0) {
      return new Response(null, {
        status: 200,
        headers: { ...baseHeaders, 'Content-Length': '0' },
      });
    }
    return new Response(createFileStream(filePath, 0, size - 1), {
      status: 200,
      headers: { ...baseHeaders, 'Content-Length': String(size) },
    });
  } catch (err) {
    console.error('[Protocol] aura-media handler error:', err);
    return new Response('Internal error', { status: 500 });
  }
}
