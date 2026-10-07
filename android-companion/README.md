# 📱 Aura Sync — Android Companion App

The Android companion client for **Aura Desktop Music Player**.

---

## ⚡ Two Easy Ways to Sync Your Android Phone

### 🌟 Method 1: Instant Mobile Web Companion (Zero-Install)
You don't need to install any APK to sync your phone!

1. Open **Aura Desktop** on your PC and click **Devices / My Phone** in the left sidebar.
2. Note your PC's **Wi-Fi IP Address** and **6-Digit Pairing PIN** (e.g. `http://192.168.1.45:43210`).
3. Open Chrome or any browser on your Android phone and go to:
   ```text
   http://<YOUR-PC-IP>:43210
   ```
4. Enter the 6-digit PIN to pair.
5. Tap **Choose Audio Files from Device** to select songs from your phone storage.
6. Aura automatically compares your library, skips duplicate tracks, and transfers new songs over Wi-Fi directly into your PC music directory!

---

### 📦 Method 2: Native Android App (React Native / Expo)

If you want to build and install the native Android `.apk`:

1. Open this folder in terminal:
   ```bash
   cd android-companion
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run on your Android phone via Expo Go:
   ```bash
   npx expo start
   ```
4. To generate a standalone Android APK:
   ```bash
   npx eas-cli build -p android --profile preview
   ```

---

## 🛡️ The Offline Playback Guarantee

* When songs are synced to your PC, they are saved permanently in `Music\Aura\Phone Sync`.
* **Disconnecting your phone or turning off Wi-Fi will NOT stop music playback on your PC.**
* **Safe Sync**: Songs deleted on your phone are **never deleted from your PC**.

