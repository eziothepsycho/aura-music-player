import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Cable,
  CheckCircle2,
  ArrowDownToLine,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  Sparkles,
  Music,
  Check,
  AlertCircle,
  FolderOpen,
  Folder,
  ChevronRight,
  X,
  UploadCloud,
  ExternalLink,
} from 'lucide-react';
import { PhoneSyncDevice } from '../../types';

interface PhoneSyncViewProps {
  device?: PhoneSyncDevice;
  onRefreshSync: () => void;
  onSyncComplete?: () => void;
}

interface DetectedPhone {
  name: string;
  path: string;
}

interface PhoneSong {
  name: string;
  size: number;
  folder?: string;
}

interface FolderItem {
  name: string;
  isFolder: boolean;
}

export const PhoneSyncView: React.FC<PhoneSyncViewProps> = ({
  device: _device,
  onRefreshSync,
  onSyncComplete,
}) => {
  const [detectedPhones, setDetectedPhones] = useState<DetectedPhone[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Folder Explorer Modal State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [phoneFolders, setPhoneFolders] = useState<FolderItem[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  // Drag and Drop State
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Scan statistics
  const [totalPhoneSongs, setTotalPhoneSongs] = useState(0);
  const [alreadySyncedCount, setAlreadySyncedCount] = useState(0);
  const [newSongs, setNewSongs] = useState<PhoneSong[]>([]);

  // Transfer progress
  const [transferProgress, setTransferProgress] = useState<{
    currentTrack: string;
    copiedCount: number;
    totalToCopy: number;
    percent: number;
  } | null>(null);

  const [syncedThisSession, setSyncedThisSession] = useState(0);
  const [targetDir, setTargetDir] = useState('Music\\Aura\\Phone Sync');

  // Load target directory
  useEffect(() => {
    if (window.auraAPI?.getPhoneSyncDir) {
      window.auraAPI.getPhoneSyncDir().then((dir: string) => {
        if (dir) setTargetDir(dir);
      });
    }
  }, []);

  // Listen for progress updates
  useEffect(() => {
    if (window.auraAPI?.onUsbTransferProgress) {
      const unsub = window.auraAPI.onUsbTransferProgress((progress: any) => {
        setTransferProgress(progress);
      });
      return unsub;
    }
  }, []);

  // Detect connected MTP devices on Windows
  const detectDevices = useCallback(async () => {
    if (!window.auraAPI?.listConnectedMtpDevices) return;
    setIsDetecting(true);
    try {
      const devices: DetectedPhone[] = await window.auraAPI.listConnectedMtpDevices();
      setDetectedPhones(devices || []);
      if (devices && devices.length > 0) {
        setSelectedPhone(devices[0].name);
      }
    } catch (err) {
      console.warn('[USB Sync] Device detection error:', err);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  useEffect(() => {
    detectDevices();
  }, [detectDevices]);

  // Open In-App Folder Explorer
  const openFolderExplorer = async () => {
    if (!selectedPhone && detectedPhones.length > 0) {
      setSelectedPhone(detectedPhones[0].name);
    }
    const phoneName = selectedPhone || (detectedPhones[0] ? detectedPhones[0].name : '');
    setIsFolderModalOpen(true);
    if (phoneName && window.auraAPI?.getDeviceFolders) {
      setIsLoadingFolders(true);
      try {
        const folders = await window.auraAPI.getDeviceFolders(phoneName);
        setPhoneFolders(folders || []);
      } catch (err) {
        console.warn('[USB Sync] Error fetching folders:', err);
      } finally {
        setIsLoadingFolders(false);
      }
    }
  };

  // Scan phone audio
  const scanPhone = async (phoneName: string, folder = '') => {
    if (!window.auraAPI?.scanMtpDevice || !phoneName) return;
    setIsScanning(true);
    setTransferProgress(null);
    setScanError(null);
    try {
      const result: any = await window.auraAPI.scanMtpDevice(phoneName, folder);
      setTotalPhoneSongs(result.totalPhoneSongs || 0);
      setAlreadySyncedCount(result.alreadySyncedCount || 0);
      setNewSongs(result.newSongs || []);
      if (!result.totalPhoneSongs || result.totalPhoneSongs === 0) {
        setScanError(
          'No audio files found on phone storage. Ensure your phone screen is unlocked and set to "File Transfer / MTP".'
        );
      }
    } catch (err: any) {
      console.error('[USB Sync] Scan failed:', err);
      setScanError(
        err?.message ||
          'Failed to scan device over USB MTP. Make sure your phone screen is unlocked and set to File Transfer.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  // Start syncing missing songs from phone to PC
  const handleStartSync = async () => {
    if (!window.auraAPI?.copyMtpTracks || !selectedPhone || newSongs.length === 0) return;

    setIsSyncing(true);
    setScanError(null);
    try {
      const trackNames = newSongs.map((s) => s.name);
      const res: any = await window.auraAPI.copyMtpTracks(selectedPhone, trackNames);
      if (res?.success) {
        setSyncedThisSession((prev) => prev + (res.transferredCount || trackNames.length));
        setAlreadySyncedCount((prev) => prev + (res.transferredCount || trackNames.length));
        setNewSongs([]);
        if (onSyncComplete) onSyncComplete();
        onRefreshSync();
      } else {
        setScanError('Transfer failed or was interrupted.');
      }
    } catch (err: any) {
      console.error('[USB Sync] Transfer error:', err);
      setScanError(err?.message || 'Transfer error occurred.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenThisPc = () => {
    if (window.auraAPI?.openThisPcFolder) {
      window.auraAPI.openThisPcFolder();
    }
  };

  // HTML5 Drag and Drop handler for files from File Explorer
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setIsSyncing(true);
    setScanError(null);
    let count = 0;
    try {
      const nativePaths: string[] = [];
      for (const file of files) {
        const nativePath = window.auraAPI?.getPathForFile ? window.auraAPI.getPathForFile(file) : '';
        if (nativePath) {
          nativePaths.push(nativePath);
        } else if (/\.(mp3|flac|wav|m4a|ogg|aac|wma|opus)$/i.test(file.name) && window.auraAPI?.importBinaryFile) {
          const buffer = await file.arrayBuffer();
          const res = await window.auraAPI.importBinaryFile(file.name, buffer);
          if (res?.success) count++;
        }
      }

      if (nativePaths.length > 0 && window.auraAPI?.importDroppedPaths) {
        const res = await window.auraAPI.importDroppedPaths(nativePaths);
        if (res?.success) {
          count += res.importedCount || 0;
        }
      }

      setSyncedThisSession((prev) => prev + count);
      if (onSyncComplete) onSyncComplete();
      onRefreshSync();
    } catch (err: any) {
      console.error('[Drop Sync] Error copying dropped files:', err);
      setScanError(err?.message || 'Failed to import dropped files.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full select-none space-y-6 transition-all ${
        isDraggingOver ? 'bg-aura-950/40 ring-2 ring-aura-500 rounded-3xl' : ''
      }`}
    >
      {/* 1. Header Hero Card — USB Phone Sync */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-aura-600 flex items-center justify-center text-white shadow-glow">
                <Cable className="w-8 h-8" />
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-dark-900 ${
                  detectedPhones.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-white">USB Phone Sync</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    detectedPhones.length > 0
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {detectedPhones.length > 0
                    ? `Connected: ${detectedPhones[0].name}`
                    : isDetecting
                    ? 'Detecting USB Phones...'
                    : 'Plug in Phone via USB'}
                </span>
              </div>
              <p className="text-xs text-dark-300 mt-1 max-w-xl">
                Direct cable synchronization for Android. Aura detects your phone through Windows MTP and copies songs directly into your PC library without internet or network limits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={detectDevices}
              disabled={isDetecting || isScanning || isSyncing}
              className="p-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-dark-300 hover:text-white transition-colors"
              title="Rescan for connected phones"
            >
              <RefreshCw className={`w-4 h-4 ${isDetecting ? 'animate-spin text-aura-400' : ''}`} />
            </button>

            {detectedPhones.length > 0 ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={openFolderExplorer}
                  disabled={isScanning || isSyncing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-700 text-white text-xs font-bold transition-all"
                >
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  <span>Browse Phone Folders</span>
                </button>

                <button
                  onClick={() => scanPhone(selectedPhone || detectedPhones[0].name, selectedFolder)}
                  disabled={isScanning || isSyncing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-aura-600 to-indigo-600 hover:from-aura-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-glow transition-all active:scale-95"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>
                    {isScanning
                      ? 'Scanning Phone...'
                      : totalPhoneSongs > 0
                      ? 'Rescan Phone'
                      : `Scan ${detectedPhones[0].name}`}
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={openFolderExplorer}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-aura-600 to-indigo-600 hover:from-aura-500 hover:to-indigo-500 text-white text-xs font-bold shadow-glow transition-all"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Browse Phone Storage</span>
              </button>
            )}
          </div>
        </div>

        {/* Device & Destination Info */}
        <div className="mt-6 pt-5 border-t border-dark-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-dark-850/80 rounded-2xl p-4 border border-dark-750 flex items-center justify-between">
            <div className="truncate mr-3">
              <span className="text-[10px] uppercase font-bold text-dark-400 tracking-wider block">
                Connected USB Phone
              </span>
              <span className="font-mono text-xs font-semibold text-cyan-300 mt-1 truncate block">
                {detectedPhones.length > 0 ? (
                  `✓ ${detectedPhones[0].name} ${selectedFolder ? `(${selectedFolder})` : '(All Storage)'}`
                ) : (
                  'No phone detected yet — Connect USB and set to "File Transfer"'
                )}
              </span>
            </div>
            <Smartphone className="w-5 h-5 text-dark-400 shrink-0" />
          </div>

          <div className="bg-dark-850/80 rounded-2xl p-4 border border-dark-750 flex items-center justify-between">
            <div className="truncate mr-3">
              <span className="text-[10px] uppercase font-bold text-dark-400 tracking-wider block">
                PC Sync Destination
              </span>
              <span className="font-mono text-xs font-semibold text-white mt-1 truncate block">
                {targetDir}
              </span>
            </div>
            <HardDrive className="w-5 h-5 text-dark-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Scanning Feedback Banner */}
      {isScanning && (
        <div className="bg-dark-900/90 border border-aura-500/50 rounded-2xl p-5 flex items-center gap-4 animate-pulse shadow-lg shadow-aura-500/10">
          <div className="w-10 h-10 rounded-xl bg-aura-500/15 text-aura-400 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 animate-spin text-aura-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">Scanning {selectedPhone || detectedPhones[0]?.name || 'phone'} for music...</h3>
            <p className="text-xs text-dark-300 mt-0.5">Searching internal storage folders (Music, Downloads, Telegram, Quick Share, etc.) for audio files.</p>
          </div>
        </div>
      )}

      {/* Error / Warning Notice Banner */}
      {scanError && (
        <div className="bg-rose-950/40 border border-rose-500/50 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-300">Sync Notice</h3>
            <p className="text-xs text-dark-200 mt-1 leading-relaxed">{scanError}</p>
          </div>
          <button onClick={() => setScanError(null)} className="text-dark-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Detected Phone Banner or USB Instructions */}
      {detectedPhones.length > 0 && totalPhoneSongs === 0 && !isScanning && (
        <div className="bg-dark-900/80 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {detectedPhones[0].name} is detected & ready!
              </h3>
              <p className="text-xs text-dark-300 mt-0.5">
                Click the scan button to automatically find all music files on your phone.
              </p>
            </div>
          </div>
          <button
            onClick={() => scanPhone(detectedPhones[0].name, selectedFolder)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all active:scale-95 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Scan Music on Phone</span>
          </button>
        </div>
      )}

      {detectedPhones.length === 0 && (
        <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <AlertCircle className="w-4 h-4 text-aura-400" />
            <span>How to connect your Android phone via USB:</span>
          </div>
          <ol className="list-decimal list-inside text-xs text-dark-300 space-y-1.5 pl-1 leading-relaxed">
            <li>Connect your phone to your PC using your <strong>USB cable</strong>.</li>
            <li>On your phone screen, swipe down and change USB mode from <em>&quot;Charging only&quot;</em> to <strong>&quot;File Transfer / MTP&quot;</strong>.</li>
            <li>Click <strong>&quot;Rescan Devices&quot;</strong> above, or browse folders below:</li>
          </ol>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleOpenThisPc}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-dark-200 text-xs font-semibold border border-dark-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open This PC in File Explorer</span>
            </button>
            <button
              onClick={openFolderExplorer}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-dark-200 text-xs font-semibold border border-dark-700 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Browse Phone Storage Inside Aura</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Differential Sync Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-dark-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Already on PC
            </span>
            <span className="font-mono text-white text-base font-bold">
              {alreadySyncedCount} songs
            </span>
          </div>
          <p className="text-[11px] text-dark-400">
            Identical tracks already in your PC library. Aura skips duplicate copies automatically.
          </p>
        </div>

        <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-dark-300">
            <span className="flex items-center gap-1.5">
              <ArrowDownToLine className="w-4 h-4 text-aura-400" />
              New on Phone
            </span>
            <span className="font-mono text-aura-300 text-base font-bold">
              {newSongs.length} new
            </span>
          </div>
          <p className="text-[11px] text-dark-400">
            Songs detected on your phone ready to copy to your PC library.
          </p>
        </div>

        <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-dark-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Safe Sync Active
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Protected
            </span>
          </div>
          <p className="text-[11px] text-dark-400">
            Disconnecting your phone will never delete your PC music. Zero network required.
          </p>
        </div>
      </div>

      {/* 4. Action Card & Live Progress */}
      {totalPhoneSongs > 0 && (
        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-aura-400" />
                <span>Found {totalPhoneSongs} total songs on {selectedPhone}</span>
              </h3>
              <p className="text-xs text-dark-400 mt-0.5">
                {newSongs.length > 0
                  ? `${newSongs.length} new songs detected that are missing from your PC library.`
                  : 'All songs on your phone are already synced to your PC!'}
              </p>
            </div>

            <button
              onClick={handleStartSync}
              disabled={isSyncing || newSongs.length === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-aura-600 via-indigo-600 to-cyan-600 hover:from-aura-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-glow transition-all active:scale-95 shrink-0"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Copying from Phone...</span>
                </>
              ) : newSongs.length > 0 ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Sync {newSongs.length} New Songs to PC</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Library Up to Date</span>
                </>
              )}
            </button>
          </div>

          {/* USB Copy Progress Bar */}
          {transferProgress && (
            <div className="space-y-2 pt-3 border-t border-dark-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-aura-300 font-semibold truncate max-w-md">
                  [{transferProgress.copiedCount}/{transferProgress.totalToCopy}] {transferProgress.currentTrack}
                </span>
                <span className="text-white font-bold">{transferProgress.percent}%</span>
              </div>
              <div className="w-full h-2.5 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-aura-500 via-indigo-400 to-cyan-400 rounded-full transition-all duration-200"
                  style={{ width: `${transferProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Preview of New Songs to Copy */}
          {newSongs.length > 0 && !isSyncing && (
            <div className="pt-2 border-t border-dark-800 space-y-2">
              <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">
                Songs Ready to Transfer:
              </span>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-2">
                {newSongs.slice(0, 30).map((song, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-dark-850/60 border border-dark-800 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate mr-3">
                      <Music className="w-3.5 h-3.5 text-aura-400 shrink-0" />
                      <span className="text-dark-200 font-medium truncate">{song.name}</span>
                    </div>
                    {song.folder && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-dark-800 text-dark-400 shrink-0">
                        {song.folder}
                      </span>
                    )}
                  </div>
                ))}
                {newSongs.length > 30 && (
                  <p className="text-[11px] text-dark-400 text-center pt-1">
                    ...and {newSongs.length - 30} more songs
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Drag & Drop Helper Card */}
      <div className="p-5 rounded-2xl bg-dark-900/60 border border-dark-800 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-dark-300">
        <div className="flex items-center gap-3">
          <UploadCloud className="w-6 h-6 text-aura-400 shrink-0" />
          <div>
            <p className="font-bold text-white">Drag &amp; Drop from File Explorer</p>
            <p className="text-[11px] text-dark-400 mt-0.5">
              You can also drag song files directly from your phone folder in Windows File Explorer right into this window.
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenThisPc}
          className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-white font-medium text-xs border border-dark-700 transition-colors shrink-0"
        >
          Open Phone in File Explorer
        </button>
      </div>

      {/* 6. Offline Guarantee */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-xs text-emerald-300">
        <HardDrive className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white">100% Offline &amp; Safe Sync</p>
          <p className="text-dark-300 text-[11px] leading-relaxed">
            All synced music files live in your local PC library at <code className="text-white">{targetDir}</code>. You can unplug your phone cable at any time and your music will continue playing with zero internet or Wi-Fi required.
            {syncedThisSession > 0 && (
              <span className="block text-emerald-400 font-semibold mt-1">
                ✓ Synced {syncedThisSession} songs this session.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ---- In-App Phone Folder Explorer Modal ---- */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scaleIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-dark-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-aura-500/10 text-aura-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {selectedPhone || (detectedPhones[0] ? detectedPhones[0].name : 'Android Phone')} Storage
                  </h3>
                  <p className="text-[11px] text-dark-400">
                    Select a folder or scan the entire phone storage
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {/* Option to Scan Entire Phone */}
              <button
                onClick={() => {
                  setSelectedFolder('');
                  setIsFolderModalOpen(false);
                  scanPhone(selectedPhone || (detectedPhones[0] ? detectedPhones[0].name : ''), '');
                }}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-aura-600/20 to-indigo-600/20 border border-aura-500/40 hover:border-aura-500 text-left flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-aura-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Internal Shared Storage (All Folders)
                    </span>
                    <span className="text-[10px] text-dark-400">
                      Scans Music, Telegram, Quick Share, Downloads, etc.
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-aura-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-dark-500 block mb-2 px-1">
                  Folders on Device:
                </span>

                {isLoadingFolders ? (
                  <div className="py-8 flex flex-col items-center justify-center text-dark-400 space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-aura-400" />
                    <span className="text-xs">Loading phone folders...</span>
                  </div>
                ) : phoneFolders.length > 0 ? (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {phoneFolders.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedFolder(item.name);
                          setIsFolderModalOpen(false);
                          scanPhone(selectedPhone || (detectedPhones[0] ? detectedPhones[0].name : ''), item.name);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-800 hover:border-dark-700 text-left flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2">
                          <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="text-xs font-medium text-dark-200 group-hover:text-white truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-dark-500 group-hover:text-dark-300 shrink-0">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-dark-400">
                    No folders found. Make sure USB is set to File Transfer.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-dark-800 bg-dark-950 flex items-center justify-between text-xs">
              <button
                onClick={handleOpenThisPc}
                className="text-dark-400 hover:text-white flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in File Explorer</span>
              </button>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
