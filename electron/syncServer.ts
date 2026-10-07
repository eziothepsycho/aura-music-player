import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';
import { app, BrowserWindow } from 'electron';
import localtunnel from 'localtunnel';
import { ScannedTrack, parseAudioMetadata } from './scanner';
import { loadLibraryState, saveLibraryState } from './storage';

export interface PhoneTrackMetadata {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  fileName: string;
  fileSize: number;
  format?: string;
}

export interface SyncComparisonResult {
  phoneTotalCount: number;
  alreadySyncedCount: number;
  newTracksToSync: PhoneTrackMetadata[];
  safeKeptPcTracks: ScannedTrack[];
}

export interface SyncServerStatus {
  isRunning: boolean;
  port: number;
  ipAddresses: string[];
  tunnelUrl?: string;
  pairingPin: string;
  connectedDevice: {
    name: string;
    model: string;
    os: string;
  } | null;
  syncProgress: {
    status: 'idle' | 'comparing' | 'transferring' | 'completed' | 'error';
    currentTrack: string;
    transferredCount: number;
    totalToTransfer: number;
    percent: number;
    message?: string;
  };
}

let server: http.Server | null = null;
let tunnel: localtunnel.Tunnel | null = null;
let currentPort = 43210;
let currentPin = '789456';
let syncStatus: SyncServerStatus = {
  isRunning: false,
  port: currentPort,
  ipAddresses: [],
  tunnelUrl: undefined,
  pairingPin: currentPin,
  connectedDevice: null,
  syncProgress: {
    status: 'idle',
    currentTrack: '',
    transferredCount: 0,
    totalToTransfer: 0,
    percent: 0,
  },
};

export function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses.length > 0 ? addresses : ['127.0.0.1'];
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getSyncMusicDir(): string {
  try {
    const baseMusic = app.getPath('music');
    return path.join(baseMusic, 'Aura', 'Phone Sync');
  } catch {
    return path.join(process.cwd(), 'Aura_Sync');
  }
}

export function startSyncServer(mainWindow: BrowserWindow | null): SyncServerStatus {
  if (server) {
    return syncStatus;
  }

  currentPin = generatePin();
  const ips = getLocalIpAddresses();

  server = http.createServer(async (req, res) => {
    // Enable CORS for mobile companion app
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Aura-Pin');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Endpoint 0: Serve Mobile Web Companion App
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getMobileCompanionHtml());
      return;
    }

    // Endpoint 1: Health & Server Discovery
    if (url.pathname === '/api/discover' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          app: 'Aura Music Player',
          version: '1.0.0',
          hostname: os.hostname(),
          platform: 'Windows',
        })
      );
      return;
    }

    // Endpoint 2: Device Pairing with PIN
    if (url.pathname === '/api/pair' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const { pin, deviceName, model, os: deviceOs } = JSON.parse(body);
          if (pin === currentPin) {
            syncStatus.connectedDevice = {
              name: deviceName || 'Android Phone',
              model: model || 'Android Device',
              os: deviceOs || 'Android',
            };
            if (mainWindow) {
              mainWindow.webContents.send('sync:device-connected', syncStatus.connectedDevice);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Paired successfully' }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Invalid pairing PIN' }));
          }
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Malformed JSON payload' }));
        }
      });
      return;
    }

    // Endpoint 3: Smart Differential Scan & Comparison
    if (url.pathname === '/api/compare' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const { phoneTracks } = JSON.parse(body) as { phoneTracks: PhoneTrackMetadata[] };
          const library = await loadLibraryState();

          const pcTracksMap = new Map<string, ScannedTrack>();
          library.songs.forEach((s) => {
            const key = `${s.title.toLowerCase().trim()}:::${s.artist.toLowerCase().trim()}`;
            pcTracksMap.set(key, s);
          });

          const newTracksToSync: PhoneTrackMetadata[] = [];
          let alreadySyncedCount = 0;
          const matchedPcKeys = new Set<string>();

          for (const pt of phoneTracks) {
            const key = `${pt.title.toLowerCase().trim()}:::${pt.artist.toLowerCase().trim()}`;
            if (pcTracksMap.has(key)) {
              alreadySyncedCount++;
              matchedPcKeys.add(key);
            } else {
              newTracksToSync.push(pt);
            }
          }

          // Safe Sync: Tracks on PC that are not on phone are safely kept!
          const safeKeptPcTracks: ScannedTrack[] = [];
          pcTracksMap.forEach((track, key) => {
            if (!matchedPcKeys.has(key)) {
              safeKeptPcTracks.push(track);
            }
          });

          const comparison: SyncComparisonResult = {
            phoneTotalCount: phoneTracks.length,
            alreadySyncedCount,
            newTracksToSync,
            safeKeptPcTracks,
          };

          if (mainWindow) {
            mainWindow.webContents.send('sync:comparison-ready', comparison);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, comparison }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: err.message }));
        }
      });
      return;
    }

    // Endpoint 4: Direct Binary Audio File Upload & Indexing
    if (url.pathname === '/api/upload-track' && req.method === 'POST') {
      const fileName = decodeURIComponent(url.searchParams.get('fileName') || `Track_${Date.now()}.mp3`);
      const targetDir = getSyncMusicDir();
      await fs.mkdir(targetDir, { recursive: true });

      const targetPath = path.join(targetDir, fileName);
      const fileStream = (await import('fs')).createWriteStream(targetPath);

      req.pipe(fileStream);

      fileStream.on('finish', async () => {
        try {
          // Parse metadata immediately
          const parsed = await parseAudioMetadata(targetPath);
          const library = await loadLibraryState();

          const existingIndex = library.songs.findIndex((s) => s.filePath === targetPath);
          if (existingIndex >= 0) {
            library.songs[existingIndex] = parsed;
          } else {
            library.songs.unshift(parsed);
          }

          if (!library.folders.includes(targetDir)) {
            library.folders.push(targetDir);
          }

          await saveLibraryState(library);

          if (mainWindow) {
            mainWindow.webContents.send('sync:track-received', parsed);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, track: parsed }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: err.message }));
        }
      });

      fileStream.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      });
      return;
    }

    res.writeHead(404);
    res.end('Aura Sync Server endpoint not found');
  });

  server.listen(currentPort, '0.0.0.0', () => {
    console.log(`[Aura Sync Server] Live on port ${currentPort}`);
    
    // Spawn zero-config public tunnel for instant phone connectivity without firewall issues
    try {
      localtunnel({ port: currentPort })
        .then((t) => {
          tunnel = t;
          syncStatus.tunnelUrl = t.url;
          console.log(`[Aura Sync Tunnel] Live on public HTTPS: ${t.url}`);
          if (mainWindow) {
            mainWindow.webContents.send('sync:status-updated', syncStatus);
          }
          t.on('close', () => {
            syncStatus.tunnelUrl = undefined;
          });
        })
        .catch((err) => {
          console.warn('[Aura Sync Tunnel] Localtunnel error:', err.message);
        });
    } catch (err: any) {
      console.warn('[Aura Sync Tunnel] Failed to start tunnel:', err.message);
    }
  });

  syncStatus = {
    isRunning: true,
    port: currentPort,
    ipAddresses: ips,
    tunnelUrl: undefined,
    pairingPin: currentPin,
    connectedDevice: null,
    syncProgress: {
      status: 'idle',
      currentTrack: '',
      transferredCount: 0,
      totalToTransfer: 0,
      percent: 0,
    },
  };

  return syncStatus;
}

export function stopSyncServer(): SyncServerStatus {
  if (tunnel) {
    try {
      tunnel.close();
    } catch {}
    tunnel = null;
  }

  if (server) {
    server.close();
    server = null;
  }

  syncStatus.isRunning = false;
  syncStatus.tunnelUrl = undefined;
  syncStatus.connectedDevice = null;
  return syncStatus;
}

export function getSyncServerStatus(): SyncServerStatus {
  syncStatus.ipAddresses = getLocalIpAddresses();
  return syncStatus;
}

// Built-in Mobile Web Companion UI for Instant Android Wi-Fi Sync
function getMobileCompanionHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Aura Sync — Android Companion</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #07080d; color: #e2e8f0; min-height: 100vh; display: flex; flex-direction: column; padding: 20px; }
    .card { background: rgba(22, 26, 43, 0.85); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 24px; margin-bottom: 20px; backdrop-filter: blur(16px); }
    .btn { display: flex; align-items: center; justify-content: center; width: 100%; padding: 14px 20px; border-radius: 14px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; box-shadow: 0 0 20px rgba(124, 58, 237, 0.4); }
    .btn-primary:active { transform: scale(0.98); }
    .pin-input { width: 100%; height: 50px; background: #111422; border: 1px solid #242a44; border-radius: 12px; font-size: 24px; text-align: center; color: #fff; font-family: 'JetBrains Mono', monospace; letter-spacing: 6px; margin: 16px 0; outline: none; }
    .pin-input:focus { border-color: #8b5cf6; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
    .badge-ready { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .progress-bar { width: 100%; height: 8px; background: #1c2137; border-radius: 99px; overflow: hidden; margin-top: 10px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #10b981); width: 0%; transition: width 0.2s; }
    .file-input { display: none; }
    .track-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1c2137; font-size: 13px; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #8b5cf6, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 20px;">🎵</div>
      <div>
        <h1 style="font-size: 18px; font-weight: 800; color: #fff; letter-spacing: 0.5px;">Aura Sync</h1>
        <p style="font-size: 11px; color: #94a3b8;">Android Phone Companion</p>
      </div>
    </div>
    <span id="statusBadge" class="badge badge-ready">● Wi-Fi Live</span>
  </div>

  <!-- Step 1: Pairing -->
  <div id="pairCard" class="card">
    <h2 style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">1. Pair with Aura PC</h2>
    <p style="font-size: 12px; color: #94a3b8;">Enter the 6-digit PIN displayed on your PC screen:</p>
    <input id="pinInput" type="text" maxlength="6" class="pin-input" placeholder="000000" inputmode="numeric">
    <button id="pairBtn" class="btn btn-primary" onclick="pairWithPc()">Connect & Pair</button>
  </div>

  <!-- Step 2: Music Selection & Sync (Hidden until paired) -->
  <div id="syncCard" class="card" style="display: none;">
    <h2 style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">2. Select Phone Audio Files</h2>
    <p style="font-size: 12px; color: #94a3b8; margin-bottom: 16px;">Pick audio files (FLAC, MP3, WAV, M4A, OGG) from your phone storage:</p>

    <input id="filePicker" type="file" multiple accept="audio/*" class="file-input" onchange="handleFilesSelected(event)">
    <button class="btn btn-primary" style="margin-bottom: 16px;" onclick="document.getElementById('filePicker').click()">
      📂 Choose Audio Files from Device
    </button>

    <div id="comparisonBox" style="display: none; background: #0c0e17; border-radius: 14px; padding: 16px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
        <span style="color: #94a3b8;">Phone Selected:</span>
        <span id="totalSelectedCount" style="font-weight: 700; color: #fff;">0</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
        <span style="color: #94a3b8;">Already on PC (Skipped):</span>
        <span id="alreadySyncedCount" style="font-weight: 700; color: #34d399;">0 ✓</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px;">
        <span style="color: #94a3b8;">New to Transfer:</span>
        <span id="newCount" style="font-weight: 700; color: #c4b5fd;">0</span>
      </div>
    </div>

    <button id="syncNowBtn" class="btn btn-primary" style="display: none;" onclick="startTransfer()">
      🚀 Start Wi-Fi Sync
    </button>

    <div id="progressBox" style="display: none; margin-top: 16px;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: monospace;">
        <span id="progressTrackName" style="color: #a78bfa; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Uploading...</span>
        <span id="progressPercent">0%</span>
      </div>
      <div class="progress-bar">
        <div id="progressFill" class="progress-fill"></div>
      </div>
    </div>
  </div>

  <!-- Safe Sync Notice -->
  <div class="card" style="background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.2); font-size: 12px; color: #6ee7b7; line-height: 1.5;">
    🛡️ <strong>Offline Playback Guarantee:</strong><br>
    Once synced to PC, music plays 100% offline. Disconnecting your phone will never stop playback.
  </div>

  <script>
    let selectedFiles = [];
    let newFilesToUpload = [];

    async function pairWithPc() {
      const pin = document.getElementById('pinInput').value.trim();
      if (pin.length !== 6) {
        alert('Please enter a valid 6-digit PIN');
        return;
      }
      try {
        const res = await fetch('/api/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pin,
            deviceName: navigator.userAgent.includes('Android') ? 'Android Phone' : 'Mobile Client',
            model: navigator.userAgent.split(';')[0] || 'Mobile',
            os: 'Android'
          })
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('pairCard').style.display = 'none';
          document.getElementById('syncCard').style.display = 'block';
        } else {
          alert('Invalid PIN. Please check the PIN on your Aura Desktop screen.');
        }
      } catch (err) {
        alert('Could not connect to Aura PC. Ensure both devices are on the same Wi-Fi.');
      }
    }

    async function handleFilesSelected(event) {
      selectedFiles = Array.from(event.target.files);
      if (selectedFiles.length === 0) return;

      const phoneTracks = selectedFiles.map(f => {
        const parts = f.name.replace(/\\.[^/.]+$/, '').split(' - ');
        return {
          title: parts.length > 1 ? parts[1].trim() : f.name.replace(/\\.[^/.]+$/, ''),
          artist: parts.length > 1 ? parts[0].trim() : 'Unknown Artist',
          duration: 0,
          fileName: f.name,
          fileSize: f.size,
          format: f.name.split('.').pop().toUpperCase()
        };
      });

      try {
        const res = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneTracks })
        });
        const data = await res.json();
        if (data.success) {
          const comp = data.comparison;
          document.getElementById('comparisonBox').style.display = 'block';
          document.getElementById('totalSelectedCount').innerText = comp.phoneTotalCount;
          document.getElementById('alreadySyncedCount').innerText = comp.alreadySyncedCount + ' ✓';
          document.getElementById('newCount').innerText = comp.newTracksToSync.length;

          // Map new tracks to file objects
          const newNames = new Set(comp.newTracksToSync.map(t => t.fileName));
          newFilesToUpload = selectedFiles.filter(f => newNames.has(f.name));

          if (newFilesToUpload.length > 0) {
            document.getElementById('syncNowBtn').style.display = 'flex';
            document.getElementById('syncNowBtn').innerText = '🚀 Sync ' + newFilesToUpload.length + ' New Songs';
          } else {
            document.getElementById('syncNowBtn').style.display = 'none';
            alert('All selected songs are already synced to your PC library!');
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function startTransfer() {
      document.getElementById('syncNowBtn').style.display = 'none';
      document.getElementById('progressBox').style.display = 'block';

      for (let i = 0; i < newFilesToUpload.length; i++) {
        const file = newFilesToUpload[i];
        document.getElementById('progressTrackName').innerText = file.name;
        const percent = Math.round(((i + 1) / newFilesToUpload.length) * 100);
        document.getElementById('progressPercent').innerText = percent + '%';
        document.getElementById('progressFill').style.width = percent + '%';

        await fetch('/api/upload-track?fileName=' + encodeURIComponent(file.name), {
          method: 'POST',
          body: file
        });
      }

      setTimeout(() => {
        alert('🎉 Synchronization complete! All songs are stored on your PC and ready to play.');
        document.getElementById('progressBox').style.display = 'none';
      }, 500);
    }
  </script>
</body>
</html>`;
}
