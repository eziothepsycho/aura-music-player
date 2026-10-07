import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  Disc3,
  Smartphone,
  HardDrive,
  UploadCloud,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface EmptyLibraryStateProps {
  onOpenAddFolder: () => void;
  onSelectTab: (tab: 'phone-sync') => void;
}

export const EmptyLibraryState: React.FC<EmptyLibraryStateProps> = ({
  onOpenAddFolder,
  onSelectTab,
}) => {
  const [defaultDir, setDefaultDir] = useState<string>('');

  useEffect(() => {
    if (window.auraAPI?.getDefaultMusicDir) {
      window.auraAPI.getDefaultMusicDir().then((dir) => {
        if (dir) setDefaultDir(dir);
      });
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto text-center select-none">
      {/* Glowing Aura Ring & Visual Icon */}
      <div className="relative mb-8">
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-aura-600/30 via-indigo-600/20 to-purple-600/30 border border-aura-500/30 flex items-center justify-center shadow-glow backdrop-blur-xl">
          <Disc3 className="w-14 h-14 text-aura-400 animate-spin-slow" />
        </div>
        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-aura-500/20 border border-aura-400/40 flex items-center justify-center text-aura-300 shadow-glow">
          <Sparkles className="w-4 h-4 text-aura-300" />
        </div>
      </div>

      {/* Main Headline & Description */}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
        Your Music Library is Empty
      </h2>
      <p className="text-dark-300 text-sm max-w-md mx-auto mb-8 leading-relaxed">
        Aura plays your offline local audio files (MP3, FLAC, WAV, M4A, OGG) with high fidelity.
        Select your local music folder to build your library.
      </p>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-8">
        {/* Card 1: Add Folder */}
        <div
          onClick={onOpenAddFolder}
          className="group relative bg-dark-900/70 hover:bg-dark-850 border border-dark-800 hover:border-aura-500/40 rounded-2xl p-5 text-left transition-all duration-200 cursor-pointer shadow-lg hover:shadow-glow/20 flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-aura-500/10 border border-aura-500/20 flex items-center justify-center text-aura-400 mb-3 group-hover:scale-110 transition-transform">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1 group-hover:text-aura-300 transition-colors">
              Choose Music Folder
            </h3>
            <p className="text-xs text-dark-400 leading-normal">
              Select any local folder containing your MP3, FLAC, WAV, or M4A collection.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-aura-400">
            <span>Browse folder</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Scan Default Windows Music Folder */}
        <div
          onClick={onOpenAddFolder}
          className="group relative bg-dark-900/70 hover:bg-dark-850 border border-dark-800 hover:border-cyan-500/40 rounded-2xl p-5 text-left transition-all duration-200 cursor-pointer shadow-lg hover:shadow-glow-cyan/20 flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
              Scan Windows Music
            </h3>
            <p className="text-xs text-dark-400 leading-normal truncate">
              {defaultDir ? `Scan ${defaultDir}` : 'Scan default Windows Music folder'}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
            <span>Scan default</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Sync Phone */}
        <div
          onClick={() => onSelectTab('phone-sync')}
          className="group relative bg-dark-900/70 hover:bg-dark-850 border border-dark-800 hover:border-emerald-500/40 rounded-2xl p-5 text-left transition-all duration-200 cursor-pointer shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
              Android Phone Sync
            </h3>
            <p className="text-xs text-dark-400 leading-normal">
              Sync music from your Android phone over Wi-Fi (Phase 5/6).
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <span>Open Devices</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Drag and Drop Zone Hint */}
      <div className="w-full border-2 border-dashed border-dark-800 hover:border-aura-500/50 rounded-2xl p-6 bg-dark-950/40 transition-colors flex items-center justify-center gap-3 text-dark-400">
        <UploadCloud className="w-5 h-5 text-dark-400" />
        <span className="text-xs font-medium">
          Drag & drop audio files directly into Aura to add to your library
        </span>
      </div>
    </div>
  );
};
