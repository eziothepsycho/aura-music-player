import React, { useState, useEffect } from 'react';
import { X, FolderPlus, HardDrive, Loader2, CheckCircle2 } from 'lucide-react';
import { ScanProgressData } from '../../../electron/preload';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (newCount: number, totalCount: number) => void;
}

export const AddFolderModal: React.FC<AddFolderModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [customPath, setCustomPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanProgressData | null>(null);
  const [defaultMusicDir, setDefaultMusicDir] = useState<string>('');

  useEffect(() => {
    if (isOpen && window.auraAPI?.getDefaultMusicDir) {
      window.auraAPI.getDefaultMusicDir().then((dir) => {
        if (dir) setDefaultMusicDir(dir);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsScanning(false);
      setScanStatus(null);
      return;
    }

    if (window.auraAPI?.onScanProgress) {
      const unsubscribe = window.auraAPI.onScanProgress((data) => {
        setScanStatus(data);
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const performScan = async (folderPath: string) => {
    if (!folderPath) return;
    setIsScanning(true);
    setScanStatus({ currentFile: 'Searching for audio files...', scannedCount: 0, totalFiles: 0, percent: 0 });

    try {
      if (window.auraAPI?.scanFolder) {
        const res = await window.auraAPI.scanFolder(folderPath);
        if (res.success) {
          onScanComplete(res.newSongsCount, res.totalSongsCount);
          setTimeout(() => {
            setIsScanning(false);
            onClose();
          }, 600);
        } else {
          alert(`Scan failed: ${res.message || 'Unknown error'}`);
          setIsScanning(false);
        }
      } else {
        // Mock fallback for browser dev
        setTimeout(() => {
          onScanComplete(5, 5);
          setIsScanning(false);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Scan error:', err);
      setIsScanning(false);
    }
  };

  const handleNativeBrowse = async () => {
    try {
      if (window.auraAPI?.openDirectory) {
        const selectedPath = await window.auraAPI.openDirectory();
        if (selectedPath) {
          await performScan(selectedPath);
        }
      }
    } catch (e) {
      console.error('Failed to open directory picker:', e);
    }
  };

  const handleScanDefault = async () => {
    const dirToScan = defaultMusicDir || 'C:\\Users\\User\\Music';
    await performScan(dirToScan);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPath.trim()) {
      performScan(customPath.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-dark-900 border border-dark-750 rounded-2xl shadow-2xl p-6 space-y-5 animate-aura-glow/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-aura-500/15 border border-aura-500/30 flex items-center justify-center text-aura-400">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Add Music Folder</h3>
          </div>
          {!isScanning && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content during scanning */}
        {isScanning ? (
          <div className="py-6 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-aura-400 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Scanning & Extracting Audio Metadata...</h4>
              <p className="text-xs text-dark-400 mt-1 truncate max-w-sm mx-auto font-mono">
                {scanStatus?.currentFile ? scanStatus.currentFile.split('\\').pop() : 'Scanning directory...'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 max-w-sm mx-auto">
              <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-aura-500 to-indigo-400 rounded-full transition-all duration-150"
                  style={{ width: `${scanStatus?.percent || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-dark-400">
                <span>{scanStatus?.scannedCount || 0} / {scanStatus?.totalFiles || 0} tracks</span>
                <span>{scanStatus?.percent || 0}%</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-dark-300 leading-relaxed">
              Choose a local folder containing your MP3, FLAC, WAV, M4A, or OGG audio files. Aura will extract ID3/Vorbis tags, high-res artwork, and build your offline library.
            </p>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                onClick={handleNativeBrowse}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-aura-600 to-indigo-600 hover:from-aura-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-glow flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Browse Folder with Windows Explorer</span>
              </button>

              {defaultMusicDir && (
                <button
                  onClick={handleScanDefault}
                  className="w-full py-2.5 px-4 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 hover:border-aura-500/40 text-dark-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <HardDrive className="w-4 h-4 text-aura-400" />
                  <span className="truncate">Scan Windows Music ({defaultMusicDir})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-dark-800" />
              <span className="text-[10px] text-dark-500 uppercase font-medium">or specify directory path</span>
              <div className="flex-1 h-px bg-dark-800" />
            </div>

            {/* Manual Path Form */}
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. D:\Music"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  className="flex-1 h-10 px-3.5 bg-dark-850 border border-dark-750 rounded-xl text-xs text-white placeholder-dark-500 focus:outline-none focus:border-aura-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!customPath.trim()}
                  className="h-10 px-4 bg-dark-800 hover:bg-dark-750 disabled:opacity-40 text-white text-xs font-semibold rounded-xl border border-dark-700 transition-colors"
                >
                  Scan
                </button>
              </div>
            </form>

            <div className="pt-2 text-[11px] text-dark-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Music remains stored locally on your PC and plays completely offline.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
