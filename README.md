# 🎵 Aura — Modern Desktop Music Player

**Aura** is a fast, beautiful, and completely **offline** Windows desktop music player built with Electron + React. It plays your local music library — including songs copied straight from your phone — with embedded album artwork, a modern dark UI, and zero cloud dependencies.

> 🎧 Your music stays on your PC. Disconnect your phone, Wi-Fi, or internet — Aura keeps playing.

---

## ✨ Features

- **🎬 Modern dark UI** — sidebar navigation, list / grid / compact library views, Albums · Artists · All Tracks · Recently Played · Favorites · Playlists, instant search, and a right-hand *Now Playing* panel with track info and queue.
- **🎵 Real local playback** — plays **MP3, FLAC, WAV, M4A/AAC, OGG, OPUS and ALAC** directly from disk through a custom `aura-media://` streaming protocol with instant **Range seeking** (scrub freely, no re-buffering).
- **🎨 Album artwork** — extracts embedded artwork automatically from **ID3/APIC (MP3)**, **MP4 cover art (M4A)**, and **FLAC picture blocks**, caches it on disk, and shows it in lists, albums, and the Now Playing panel.
- **📱 Phone import (USB / MTP)** — detect an Android phone over USB, browse its folders, scan for songs, and copy tracks into your PC library. Copies are saved permanently to `Music\Aura\Phone Sync`.
- **🔍 Smart duplicate handling** — the same song is never imported twice, but a song you deleted from Aura can always be copied again.
- **🗑️ Clean delete** — remove a song from the library (and its local copy if Aura copied it), with automatic cleanup of favorites, playlists, and cached artwork references.
- **💾 Fully persistent library** — songs, artwork, favorites, and playlists survive restarts. Nothing depends on your phone staying connected.
- **⌨️ Media keys** — Windows lock-screen and hardware media keys via the Media Session API.
- **📦 Offline by design** — no accounts, no telemetry, no streaming services.

---

## 🖥️ Requirements

| | |
|---|---|
| OS | Windows 10 / 11 (x64) |
| Node.js | **18+** (Node 20 LTS recommended) |
| npm | Comes with Node.js |

> To **run Aura without building it**, you only need a release installer — Node.js is only required for development.

---

## 🚀 Quick Start (run from source)

```powershell
git clone https://github.com/eziothepsycho/aura-music-player.git
cd aura-music-player

npm install        # install dependencies
npm run dev        # start Aura in development mode
```

`npm run dev` launches the Vite dev server and Electron together. The app window opens automatically once the dev server is ready on port `5173`.

### All available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run Aura in development mode (hot reload) |
| `npm run dev:vite` | Start only the renderer dev server |
| `npm run dev:electron` | Start only the Electron shell (waits for port 5173) |
| `npm run build` | Compile Electron TypeScript + build the renderer to `dist/` |
| `npm run package` | Full build → Windows **NSIS installer + portable exe** (in `release/`) |
| `npm run package:portable` | Portable executable only |
| `npm run package:dir` | Unpacked app folder (no installer) |
| `npm run preview` | Preview the built renderer in a browser |

## 📖 How to Use

### 1️⃣ Import music

Three ways to get songs into your library:

- **Add Folder** — click **Add Folder** in the header, pick a folder, and Aura scans it recursively with live progress. Re-scanning is safe: existing songs are updated, nothing is duplicated, and broken entries whose files were deleted are cleaned up automatically.
- **Drag & Drop** — drag files or folders anywhere onto the Aura window. Native files import directly; phone/MTP drops are copied into Aura's storage automatically.
- **Phone Sync (USB)** — open the **Phone Sync** tab in the sidebar:
  1. Connect your Android phone via USB (MTP) — or choose any mounted phone/USB folder.
  2. **Detect** the device and browse/select a music folder.
  3. **Scan** — Aura lists new songs and tells you which are already in your library.
  4. **Copy** — tracks are copied to `Music\Aura\Phone Sync`, metadata and artwork are extracted, and they appear in your library instantly.

### 2️⃣ Play music

- Hover a row and click **▶** (or double-click the row) to play.
- Bottom player bar: **shuffle · previous · play/pause · next · repeat · seek · volume · playback speed · queue**.
- The progress bar seeks instantly — click or drag anywhere on it.
- Open the **Now Playing** panel (right side) for track details and the current queue.

### 3️⃣ Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `M` | Mute / Unmute |
| `Ctrl + →` | Next track |
| `Ctrl + ←` | Previous track |
| `→` | Seek forward 5 s |
| `←` | Seek backward 5 s |

Windows hardware media keys and the lock-screen media overlay also work (play/pause, next/previous).

### 4️⃣ Favorites, playlists & search

- Click the **♡** on any row to favorite a song — favorites are saved permanently.
- Create playlists from the sidebar to organize your library.
- The header search box filters instantly by title / artist / album / genre.

### 5️⃣ Delete a song

Hover a row → click the **🗑** button:

- A confirmation dialog tells you exactly what will happen.
- For songs **Aura copied from your phone**, the local copy in `Music\Aura\Phone Sync` is deleted too.
- For songs from **your own folders**, only the library entry is removed — your file stays on disk.
- Favorites, playlist entries, and now-unused cached artwork are cleaned up automatically.
- Re-importing the song later treats it as a brand-new, fully working track (fresh metadata, fresh artwork, working playback).

### 6️⃣ Album artwork

Artwork is extracted **from the audio files themselves** during import (MP3 ID3 APIC, M4A/MP4 cover art, FLAC picture metadata). Songs without an embedded cover show a stylish gradient tile instead. Artwork is cached in Aura's data folder, so it keeps displaying after restarts even with your phone disconnected.

---

## 🗂️ Where your data lives

| What | Location |
|---|---|
| Library database | `%APPDATA%\aura\aura_library.json` |
| Cached album artwork | `%APPDATA%\aura\artwork\` |
| Songs copied from your phone | `%USERPROFILE%\Music\Aura\Phone Sync\` |

Everything above is **local to your PC** and never depends on your phone staying connected.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 34 |
| UI | React 18 + TypeScript 5.7 |
| Styling | Tailwind CSS 3 |
| Build | Vite 6 |
| Metadata & artwork | `music-metadata` |
| Packaging | `electron-builder` (NSIS + portable) |

---

## 📁 Project Structure

```text
aura-music-player/
├── electron/                   # Electron main process
│   ├── main.ts                 # App entry, IPC, custom aura-media:// protocol
│   ├── mediaUrl.ts             # Canonicalization-safe media URL builder/parser
│   ├── mediaProtocol.ts        # Audio/artwork streaming with Range (seek) support
│   ├── preload.ts              # contextBridge API exposed to the renderer
│   ├── scanner.ts              # Folder scanning + metadata/artwork extraction
│   ├── storage.ts              # Library persistence (JSON) + artwork cache
│   └── usbSync.ts              # USB / MTP phone import
├── src/                        # React renderer
│   ├── App.tsx                 # Root state, import & delete flows
│   ├── hooks/useAudioEngine.ts # HTML5 audio playback engine
│   └── components/             # Sidebar, player bar, library views, modals…
├── android-companion/          # Android companion app project
├── build/                      # App icons
├── scripts/                    # Icon generation utilities
├── index.html
└── package.json
```

---

## 📱 Android Companion

The `android-companion/` folder contains the companion mobile app project for future Wi-Fi syncing (see its [README](android-companion/README.md)). Phone import in the desktop app currently works over **USB / MTP** via the **Phone Sync** tab.

---

## 📄 License

MIT © Aura

