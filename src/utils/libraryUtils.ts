import { Track, Album, Artist } from '../types';

const GRADIENTS = [
  'from-violet-600 via-purple-700 to-indigo-950',
  'from-pink-600 via-fuchsia-800 to-purple-950',
  'from-cyan-600 via-blue-700 to-slate-950',
  'from-emerald-600 via-teal-800 to-zinc-950',
  'from-amber-600 via-orange-800 to-stone-950',
  'from-rose-600 via-red-800 to-neutral-950',
];

function safeHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function deriveAlbums(tracks: Track[]): Album[] {
  if (!Array.isArray(tracks)) return [];
  const albumMap = new Map<string, { album: string; artist: string; tracks: Track[]; year: number; coverUrl?: string }>();

  tracks.forEach((t) => {
    if (!t || typeof t !== 'object') return;
    const albumName = (t.album && typeof t.album === 'string') ? t.album : 'Unknown Album';
    const artistName = (t.artist && typeof t.artist === 'string') ? t.artist : 'Unknown Artist';
    const key = `${albumName.toLowerCase()}:::${artistName.toLowerCase()}`;

    if (!albumMap.has(key)) {
      albumMap.set(key, {
        album: albumName,
        artist: artistName,
        tracks: [],
        year: (typeof t.year === 'number' && !isNaN(t.year)) ? t.year : 2024,
        coverUrl: t.coverUrl,
      });
    }
    const record = albumMap.get(key)!;
    record.tracks.push(t);
    if (!record.coverUrl && t.coverUrl) {
      record.coverUrl = t.coverUrl;
    }
    if (t.year && t.year < record.year) {
      record.year = t.year;
    }
  });

  return Array.from(albumMap.entries()).map(([key, data], index) => {
    const totalDuration = data.tracks.reduce((sum, t) => sum + (t && typeof t.duration === 'number' ? t.duration : 0), 0);
    return {
      id: `alb-${index}-${safeHash(key)}`,
      title: data.album,
      artist: data.artist,
      year: data.year,
      coverUrl: data.coverUrl,
      coverGradient: GRADIENTS[index % GRADIENTS.length],
      trackCount: data.tracks.length,
      duration: totalDuration,
    };
  });
}

export function deriveArtists(tracks: Track[]): Artist[] {
  if (!Array.isArray(tracks)) return [];
  const artistMap = new Map<string, { name: string; albums: Set<string>; trackCount: number; coverUrl?: string }>();

  tracks.forEach((t) => {
    if (!t || typeof t !== 'object') return;
    const name = (t.artist && typeof t.artist === 'string') ? t.artist : 'Unknown Artist';
    if (!artistMap.has(name)) {
      artistMap.set(name, {
        name,
        albums: new Set(),
        trackCount: 0,
        coverUrl: t.coverUrl,
      });
    }
    const record = artistMap.get(name)!;
    record.trackCount += 1;
    if (t.album && typeof t.album === 'string') record.albums.add(t.album);
    if (!record.coverUrl && t.coverUrl) record.coverUrl = t.coverUrl;
  });

  return Array.from(artistMap.entries()).map(([name, data], index) => ({
    id: `art-${index}`,
    name,
    coverUrl: data.coverUrl,
    albumCount: data.albums.size || 1,
    trackCount: data.trackCount,
  }));
}

