import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { buildMediaUrl } from './mediaUrl';

export interface ScanProgressData {
  currentFile: string;
  scannedCount: number;
  totalFiles: number;
  percent: number;
}

const api = {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getDefaultMusicDir: () => ipcRenderer.invoke('app:get-default-music-dir'),
  openDirectory: () => ipcRenderer.invoke('app:open-directory'),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('app:show-item-in-folder', filePath),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),

  // Library & Scanning
  getLibraryState: () => ipcRenderer.invoke('library:get-state'),
  saveLibraryState: (state: unknown) => ipcRenderer.invoke('library:save-state', state),
  scanFolder: (folderPath: string) => ipcRenderer.invoke('library:scan-folder', folderPath),
  deleteSong: (songId: string) => ipcRenderer.invoke('library:delete-song', songId),

  // Drag and Drop & Native File Import
  getPathForFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file) || '';
    } catch {
      return '';
    }
  },
  importDroppedPaths: (paths: string[]) =>
    ipcRenderer.invoke('library:import-dropped-paths', paths),
  importBinaryFile: (fileName: string, buffer: ArrayBuffer) =>
    ipcRenderer.invoke('library:import-binary-file', fileName, buffer),

  onScanProgress: (callback: (data: ScanProgressData) => void) => {
    const subscription = (_event: unknown, data: ScanProgressData) => callback(data);
    ipcRenderer.on('library:scan-progress', subscription);
    return () => {
      ipcRenderer.removeListener('library:scan-progress', subscription);
    };
  },

  // USB Phone Sync & MTP
  listConnectedMtpDevices: () => ipcRenderer.invoke('usb:list-devices'),
  getDeviceFolders: (deviceName: string, subfolder?: string) =>
    ipcRenderer.invoke('usb:get-device-folders', deviceName, subfolder),
  scanMtpDevice: (deviceName: string, targetFolder?: string) =>
    ipcRenderer.invoke('usb:scan-mtp', deviceName, targetFolder),
  copyMtpTracks: (deviceName: string, trackNames: string[]) =>
    ipcRenderer.invoke('usb:copy-mtp', deviceName, trackNames),
  openThisPcFolder: () => ipcRenderer.invoke('usb:open-this-pc'),
  selectUsbPhoneFolder: () => ipcRenderer.invoke('usb:select-phone-folder'),
  getPhoneSyncDir: () => ipcRenderer.invoke('usb:get-target-dir'),
  scanUsbPhoneFolder: (folderPath: string) => ipcRenderer.invoke('usb:scan-phone', folderPath),
  transferUsbTracks: (tracks: { sourcePath: string; fileName: string }[]) =>
    ipcRenderer.invoke('usb:transfer-tracks', tracks),

  onUsbTransferProgress: (callback: (progress: any) => void) => {
    const subscription = (_event: unknown, progress: any) => callback(progress);
    ipcRenderer.on('usb:transfer-progress', subscription);
    return () => {
      ipcRenderer.removeListener('usb:transfer-progress', subscription);
    };
  },

  onTrackReceived: (callback: (track: unknown) => void) => {
    const subscription = (_event: unknown, track: unknown) => callback(track);
    ipcRenderer.on('sync:track-received', subscription);
    return () => {
      ipcRenderer.removeListener('sync:track-received', subscription);
    };
  },

  // Convert a local file path into a canonicalization-safe aura-media URL
  // (see mediaUrl.ts — naive aura-media:///C:/... URLs lose the drive letter
  // to Chromium's host canonicalization and never resolve).
  getAudioUrl: (filePath: string) => buildMediaUrl(filePath),
};

contextBridge.exposeInMainWorld('auraAPI', api);

export type AuraAPI = typeof api;
