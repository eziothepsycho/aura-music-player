import React from 'react';
import { Play, Disc3 } from 'lucide-react';
import { Album } from '../../types';

interface TrackGridViewProps {
  albums: Album[];
  onSelectAlbum: (album: Album) => void;
}

export const TrackGridView: React.FC<TrackGridViewProps> = ({ albums, onSelectAlbum }) => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {albums.map((album) => (
          <div
            key={album.id}
            onClick={() => onSelectAlbum(album)}
            className="group bg-dark-900/60 hover:bg-dark-850/90 border border-dark-800 hover:border-aura-500/40 rounded-2xl p-3.5 transition-all duration-200 cursor-pointer flex flex-col shadow-sm hover:shadow-glow/15"
          >
            {/* Album Cover Art Card with Overlay Play Button */}
            <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-dark-800 flex items-center justify-center border border-dark-750">
              {album.coverUrl ? (
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${album.coverGradient} opacity-90 group-hover:scale-105 transition-transform duration-300 flex items-center justify-center`}
                >
                  <Disc3 className="w-12 h-12 text-white/40" />
                </div>
              )}

              {/* Glowing Play Hover Button */}
              <button className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-aura-500 hover:bg-aura-400 text-white flex items-center justify-center shadow-glow opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 active:scale-95">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            </div>

            {/* Album Info */}
            <h4 className="text-xs font-bold text-white truncate mb-0.5 group-hover:text-aura-300 transition-colors">
              {album.title}
            </h4>
            <p className="text-[11px] text-dark-400 truncate mb-1">{album.artist}</p>
            <div className="flex items-center justify-between text-[10px] text-dark-500 font-mono mt-auto">
              <span>{album.year || '2024'}</span>
              <span>{album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
