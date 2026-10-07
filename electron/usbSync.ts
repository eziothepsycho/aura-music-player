import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { app, BrowserWindow } from 'electron';
import { findAudioFiles, parseAudioMetadata, ScannedTrack } from './scanner';
import { loadLibraryState, saveLibraryState, upsertTrack, LibraryState } from './storage';

const execFileAsync = promisify(execFile);

export interface MtpDevice {
  name: string;
  path: string;
}

export interface MtpFolderItem {
  name: string;
  isFolder: boolean;
}

export interface UsbPhoneSong {
  name: string;
  size: number;
  folder?: string;
}

export interface UsbScanResult {
  phoneName: string;
  totalPhoneSongs: number;
  alreadySyncedCount: number;
  newSongs: UsbPhoneSong[];
}

export function getPhoneSyncDir(): string {
  try {
    const musicDir = app.getPath('music');
    return path.join(musicDir, 'Aura', 'Phone Sync');
  } catch {
    return path.join(process.cwd(), 'Aura_Sync');
  }
}

/**
 * File names (lowercase) of tracks that are genuinely present on this PC.
 *
 * A library record whose local file no longer exists is STALE and must not
 * count as "already synced" — otherwise a song the user deleted (inside or
 * outside Aura) could never be copied from the phone again.
 */
function buildExistingTrackNames(library: LibraryState): Set<string> {
  const names = new Set<string>();
  for (const s of library.songs) {
    if (!s.filePath || !existsSync(s.filePath)) continue;
    names.add(path.basename(s.filePath).toLowerCase());
  }
  return names;
}

/**
 * Execute PowerShell script safely without external file dependencies
 */
async function runPowerShell(script: string, timeoutMs = 60000): Promise<string> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    {
      timeout: timeoutMs,
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
    }
  );
  return stdout.trim();
}

/**
 * Lists connected MTP Android phones via Windows Shell COM
 */
export async function listConnectedMtpDevices(): Promise<MtpDevice[]> {
  try {
    const script = `
      $ErrorActionPreference = 'SilentlyContinue'
      $shell = New-Object -ComObject Shell.Application
      $computer = $shell.NameSpace(17)
      $devices = @()

      foreach ($item in $computer.Items()) {
        $path = "$($item.Path)"
        if ($path.StartsWith("::{20D04FE0-") -or $item.Type -like "*Portable Device*" -or $item.Type -like "*Phone*") {
          $devices += @{
            name = "$($item.Name)"
            path = $path
          }
        }
      }

      if ($devices.Count -gt 0) {
        $devices | ConvertTo-Json -Compress
      } else {
        Write-Output "[]"
      }
    `;

    const raw = await runPowerShell(script, 10000);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    console.warn('[MTP Sync] Could not list MTP devices:', err);
    return [];
  }
}

/**
 * Lists folders inside an MTP device / storage
 */
export async function getDeviceFolders(deviceName: string, parentSubfolder = ''): Promise<MtpFolderItem[]> {
  try {
    const safeDevice = deviceName.replace(/"/g, '`"');
    const safeSub = parentSubfolder.replace(/"/g, '`"');

    const script = `
      $ErrorActionPreference = 'SilentlyContinue'
      $shell = New-Object -ComObject Shell.Application
      $computer = $shell.NameSpace(17)
      $phone = $null

      foreach ($item in $computer.Items()) {
        if ($item.Name -like "*${safeDevice}*") {
          $phone = $item
          break
        }
      }

      if ($null -eq $phone) { Write-Output "[]"; exit }

      $storage = $phone.GetFolder.Items() | Select-Object -First 1
      if ($null -eq $storage) { Write-Output "[]"; exit }

      $targetFolder = $storage.GetFolder
      $subPath = "${safeSub}".Trim()

      if ($subPath) {
        $parts = $subPath -split "[/\\\\]"
        foreach ($part in $parts) {
          if ($part) {
            $matched = $targetFolder.Items() | Where-Object { $_.Name -eq $part -and $_.IsFolder } | Select-Object -First 1
            if ($matched) {
              $targetFolder = $matched.GetFolder
            }
          }
        }
      }

      $items = @()
      foreach ($child in $targetFolder.Items()) {
        if ($child.IsFolder -and -not $child.Name.StartsWith(".") -and $child.Name.ToLower() -ne "android") {
          $items += @{
            name = "$($child.Name)"
            isFolder = $true
          }
        }
      }

      if ($items.Count -gt 0) {
        $items | ConvertTo-Json -Compress
      } else {
        Write-Output "[]"
      }
    `;

    const raw = await runPowerShell(script, 15000);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    console.warn('[MTP Sync] Error listing device folders:', err);
    return [];
  }
}

/**
 * Scans all audio files on an MTP phone and computes differential sync
 */
export async function scanMtpDevice(deviceName: string, targetFolder = ''): Promise<UsbScanResult> {
  const safeDevice = deviceName.replace(/"/g, '`"');
  const safeSub = targetFolder.replace(/"/g, '`"');

  const script = `
    $ErrorActionPreference = 'SilentlyContinue'
    $shell = New-Object -ComObject Shell.Application
    $computer = $shell.NameSpace(17)
    $phone = $null

    foreach ($item in $computer.Items()) {
      if ($item.Name -like "*${safeDevice}*") {
        $phone = $item
        break
      }
    }

    if ($null -eq $phone) { exit }

    $exts = @(".mp3", ".flac", ".wav", ".m4a", ".ogg", ".aac", ".wma", ".opus")

    function Recurse-Folder($folder, [int]$depth) {
      if ($depth -gt 5 -or $null -eq $folder) { return }

      foreach ($child in $folder.Items()) {
        if ($child.IsFolder) {
          $cName = $child.Name.ToLower()
          if ($cName -ne "android" -and $cName -ne ".thumbnails" -and -not $cName.StartsWith(".")) {
            Recurse-Folder $child.GetFolder ($depth + 1)
          }
        } else {
          $ext = [System.IO.Path]::GetExtension($child.Name).ToLower()
          if ($exts -contains $ext) {
            $fTitle = "$($folder.Title)".Replace("\`t", " ")
            $cName = "$($child.Name)".Replace("\`t", " ")
            Write-Output "$($child.Size)\`t$fTitle\`t$cName"
          }
        }
      }
    }

    $phoneFolder = $phone.GetFolder
    $subPath = "${safeSub}".Trim()

    foreach ($storage in $phoneFolder.Items()) {
      if ($storage.IsFolder) {
        if ($subPath) {
          $matched = $storage.GetFolder.Items() | Where-Object { $_.Name -like "*$subPath*" -and $_.IsFolder } | Select-Object -First 1
          if ($matched) {
            Recurse-Folder $matched.GetFolder 0
          } else {
            Recurse-Folder $storage.GetFolder 0
          }
        } else {
          Recurse-Folder $storage.GetFolder 0
        }
      }
    }
  `;

  const raw = await runPowerShell(script, 90000);
  const lines = raw ? raw.split(/\r?\n/).filter((l) => l.trim().length > 0) : [];
  const songsArray: UsbPhoneSong[] = lines
    .map((line) => {
      const parts = line.split('\t');
      return {
        size: parseInt(parts[0], 10) || 0,
        folder: parts[1] || '',
        name: parts.slice(2).join('\t'),
      };
    })
    .filter((s) => s.name);

  const library = await loadLibraryState();

  // Create lookup set for existing PC library tracks (file must actually exist)
  const pcTrackNames = buildExistingTrackNames(library);

  const newSongs: UsbPhoneSong[] = [];
  let alreadySyncedCount = 0;

  for (const song of songsArray) {
    const base = song.name.toLowerCase();
    if (pcTrackNames.has(base)) {
      alreadySyncedCount++;
    } else {
      newSongs.push(song);
    }
  }

  return {
    phoneName: deviceName,
    totalPhoneSongs: songsArray.length,
    alreadySyncedCount,
    newSongs,
  };
}

/**
 * Syncs selected tracks from MTP phone to PC library
 */
export async function copyMtpTracks(
  deviceName: string,
  trackNames: string[],
  mainWindow: BrowserWindow | null
): Promise<{ success: boolean; transferredCount: number; library: LibraryState }> {
  const targetDir = getPhoneSyncDir();
  await fs.mkdir(targetDir, { recursive: true });

  const safeDevice = deviceName.replace(/"/g, '`"');
  const safeTarget = targetDir.replace(/"/g, '`"');

  const BATCH_SIZE = 25;
  let totalTransferred = 0;
  const library = await loadLibraryState();
  const tempJsonDir = app ? app.getPath('temp') : require('os').tmpdir();

  for (let b = 0; b < trackNames.length; b += BATCH_SIZE) {
    const batch = trackNames.slice(b, b + BATCH_SIZE);
    const tempJsonPath = path.join(tempJsonDir, `aura_sync_batch_${Date.now()}_${b}.json`);
    await fs.writeFile(tempJsonPath, JSON.stringify(batch), 'utf8');

    const safeTempJson = tempJsonPath.replace(/"/g, '`"');

    const script = `
      $ErrorActionPreference = 'SilentlyContinue'
      $shell = New-Object -ComObject Shell.Application
      $destFolder = $shell.NameSpace("${safeTarget}")
      if ($null -eq $destFolder) { exit }

      $phone = $null
      foreach ($item in $shell.NameSpace(17).Items()) {
        if ($item.Name -like "*${safeDevice}*") {
          $phone = $item
          break
        }
      }

      if ($null -eq $phone) { exit }

      $namesList = Get-Content -Raw "${safeTempJson}" | ConvertFrom-Json

      function Copy-Matching($folder) {
        foreach ($child in $folder.Items()) {
          if ($child.IsFolder) {
            $cName = $child.Name.ToLower()
            if ($cName -ne "android" -and -not $cName.StartsWith(".")) {
              Copy-Matching $child.GetFolder
            }
          } else {
            if ($namesList -contains $child.Name) {
              $destFolder.CopyHere($child, 528)
            }
          }
        }
      }

      foreach ($storage in $phone.GetFolder.Items()) {
        if ($storage.IsFolder) {
          Copy-Matching $storage.GetFolder
        }
      }

      Start-Sleep -Seconds 2
    `;

    try {
      await runPowerShell(script, 60000);
    } catch (copyErr) {
      console.warn('[MTP Sync] Batch copy error:', copyErr);
    } finally {
      try {
        await fs.unlink(tempJsonPath);
      } catch {}
    }

    // Verify and index copied files
    for (let i = 0; i < batch.length; i++) {
      const fileName = batch[i];
      const safeName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
      
      let targetPath = path.join(targetDir, fileName);
      const fsSync = require('fs');
      if (!fsSync.existsSync(targetPath)) {
        targetPath = path.join(targetDir, safeName);
      }

      try {
        if (fsSync.existsSync(targetPath)) {
          const parsed = await parseAudioMetadata(targetPath);
          upsertTrack(library, parsed);
          totalTransferred++;

          if (mainWindow) {
            mainWindow.webContents.send('sync:track-received', parsed);
          }
        }
      } catch (err) {
        console.warn(`[MTP Sync] Could not parse metadata for ${targetPath}:`, err);
      }

      if (mainWindow) {
        const percent = Math.round(((b + i + 1) / trackNames.length) * 100);
        mainWindow.webContents.send('usb:transfer-progress', {
          currentTrack: fileName,
          copiedCount: b + i + 1,
          totalToCopy: trackNames.length,
          percent,
        });
      }
    }
  }

  if (!library.folders.includes(targetDir)) {
    library.folders.push(targetDir);
  }

  await saveLibraryState(library);

  return {
    success: true,
    transferredCount: totalTransferred,
    library,
  };
}

/**
 * Fallback: Scans standard USB / mounted directory
 */
export async function scanUsbPhoneFolder(folderPath: string): Promise<UsbScanResult> {
  const audioFiles = await findAudioFiles(folderPath);
  const library = await loadLibraryState();

  // Only count tracks whose local file actually exists — stale records
  // (deleted files) must not hide the song from a re-scan.
  const pcTrackNames = buildExistingTrackNames(library);

  const newSongs: UsbPhoneSong[] = [];
  let alreadySyncedCount = 0;

  for (const filePath of audioFiles) {
    const fileName = path.basename(filePath);
    if (pcTrackNames.has(fileName.toLowerCase())) {
      alreadySyncedCount++;
      continue;
    }

    try {
      const stats = await fs.stat(filePath);
      newSongs.push({ name: fileName, size: stats.size });
    } catch {
      newSongs.push({ name: fileName, size: 0 });
    }
  }

  return {
    phoneName: path.basename(folderPath),
    totalPhoneSongs: audioFiles.length,
    alreadySyncedCount,
    newSongs,
  };
}

export async function transferUsbTracks(
  tracksToCopy: { sourcePath: string; fileName: string }[],
  mainWindow: BrowserWindow | null
): Promise<{ success: boolean; transferredCount: number; library: LibraryState }> {
  const targetDir = getPhoneSyncDir();
  await fs.mkdir(targetDir, { recursive: true });

  const total = tracksToCopy.length;
  const library = await loadLibraryState();
  let addedCount = 0;

  for (let i = 0; i < total; i++) {
    const item = tracksToCopy[i];
    const safeName = item.fileName.replace(/[/\\?%*:|"<>]/g, '_');
    const targetPath = path.join(targetDir, safeName);

    try {
      await fs.copyFile(item.sourcePath, targetPath);
      const parsed = await parseAudioMetadata(targetPath);
      upsertTrack(library, parsed);
      addedCount++;

      if (mainWindow) {
        const percent = Math.round(((i + 1) / total) * 100);
        mainWindow.webContents.send('usb:transfer-progress', {
          currentTrack: item.fileName,
          copiedCount: i + 1,
          totalToCopy: total,
          percent,
        });
        mainWindow.webContents.send('sync:track-received', parsed);
      }
    } catch (err) {
      console.error(`[USB Sync] Failed to copy track ${item.sourcePath}:`, err);
    }
  }

  if (!library.folders.includes(targetDir)) {
    library.folders.push(targetDir);
  }

  await saveLibraryState(library);

  return {
    success: true,
    transferredCount: addedCount,
    library,
  };
}
