# 🎵 Aura — Release v1.0.0

**Aura** is a modern, standalone Windows desktop music player and companion phone synchronizer designed for fast, beautiful, and completely offline local listening.

---

## 📦 Downloads & Binaries

| Asset | Type | Size | Description |
|---|---|---|---|
| [**`Aura-Setup-1.0.0.exe`**](file:///D:/music-player/release/Aura-Setup-1.0.0.exe) | Windows Installer | ~85.2 MB | Standard Windows NSIS Setup with Start Menu & Desktop Shortcuts |
| [**`Aura-Portable-1.0.0.exe`**](file:///D:/music-player/release/Aura-Portable-1.0.0.exe) | Portable Executable | ~85.0 MB | Zero-install portable edition (runs from USB or any folder) |
| [`win-unpacked/Aura.exe`](file:///D:/music-player/release/win-unpacked/Aura.exe) | Unpacked Binary | — | Pre-extracted standalone application binary |

### 🔒 SHA-256 Checksums

```text
E7EB3B38539B8915D52943B73CE74F637257D8B78C26898AC4B7540026D1E45B  Aura-Setup-1.0.0.exe
4EB8B388BE9381F8996E90831C8572C24B4B166C95602F9E4414DB62A8C0DF50  Aura-Portable-1.0.0.exe
```

---

## 🌟 Key Features

### 1. 🎨 Dark Modern Music Player UI
* **Sidebar Navigation**: Home, Search, Music Library, Favorites, Custom Playlists, Devices.
* **Library Organization**: Filter tracks by Albums, Artists, All Tracks, and Recently Played.
* **Right Panel Info**: Real-time album artwork, track details, bitrate/format badges, and quick keyboard cheat-sheet.
* **Bottom Player Controls**: Shuffle, previous, play/pause, next, repeat mode, waveform progress bar with instant seek, volume control, and mini-player toggle.

### 2. 🔌 100% Offline Local Playback
* Plays **MP3, FLAC, WAV, M4A, AAC, and OGG** directly from local storage.
* High-performance streaming with custom `aura-media://` protocol supporting instant Range seeking.
* Zero external cloud dependencies — your music stays completely private on your PC.
* Disconnecting phone or Wi-Fi never interrupts current or future music playback.

### 3. 📱 Android Wi-Fi Companion Sync
* **Zero-Install Mobile Web Companion**: Open the displayed pairing URL on any phone browser (`http://<PC-IP>:43210`) with 4-digit PIN security.
* **Standalone React Native Companion**: Dedicated mobile app project in `android-companion/`.
* **Smart Differential Sync**: Computes library differences and only uploads songs missing from the PC.
* **Safe Sync Protection**: Removing songs from your phone will **never** delete existing PC library tracks.

### 4. ⌨️ Windows Media Keys & Keyboard Shortcuts
* `Space`: Play / Pause
* `Ctrl + →` / `Ctrl + ←`: Next Track / Previous Track
* `Ctrl + ↑` / `Ctrl + ↓`: Volume Up / Volume Down
* `M`: Mute / Unmute
* `S`: Toggle Shuffle
* `R`: Toggle Repeat Mode
* Native Windows `navigator.mediaSession` integration (OSD volume overlay & hardware media keys).

---

## 🚀 Installation & Getting Started

### For End Users
1. Download **`Aura-Setup-1.0.0.exe`**.
2. Run the installer and choose your preferred destination directory.
3. Launch **Aura Music Player** from your Desktop or Start Menu.
4. Click **"Scan Folder"** to import your local music library.

### To Sync with your Android Phone:
1. Make sure your PC and Phone are connected to the same Wi-Fi network.
2. In Aura Desktop, click **"Sync Phone"** or open the **Devices** tab.
3. Open the pairing link or scan the QR code on your phone.
4. Select music tracks on your phone and tap **"Sync to PC"**.

---

## 🛠️ Developer & Build Instructions

```powershell
# Install dependencies
npm install

# Run in Development Mode
npm run dev

# Compile TypeScript & Build Renderer
npm run build

# Package Windows Installer & Portable Binary
npm run package
```

---

*Created with ❤️ for Aura Music Player.*

