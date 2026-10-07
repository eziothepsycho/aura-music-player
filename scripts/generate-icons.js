const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.disableHardwareAcceleration();

function createIcoFromPngs(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  
  let currentOffset = headerSize;
  const entries = [];
  
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0); // width
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(currentOffset, 12); // offset
    
    entries.push(entry);
    currentOffset += item.buffer.length;
  }
  
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // count
  
  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    webPreferences: {
      offscreen: true,
    },
  });

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1e1338"/>
          <stop offset="60%" stop-color="#0c0a17"/>
          <stop offset="100%" stop-color="#06050b"/>
        </radialGradient>
        <linearGradient id="orbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#c084fc"/>
          <stop offset="40%" stop-color="#9333ea"/>
          <stop offset="100%" stop-color="#4f46e5"/>
        </linearGradient>
        <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ec4899"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#a855f7" flood-opacity="0.5"/>
        </filter>
        <filter id="subtleGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- App Icon Background rounded squircle -->
      <rect width="512" height="512" rx="112" fill="url(#bgGrad)" stroke="rgba(168, 85, 247, 0.25)" stroke-width="4"/>

      <!-- Ambient Glow Ring -->
      <circle cx="256" cy="256" r="160" fill="none" stroke="url(#glowGrad)" stroke-width="2" opacity="0.4" stroke-dasharray="12 8"/>
      
      <!-- Central Glowing Aura Disc -->
      <circle cx="256" cy="256" r="128" fill="url(#orbGrad)" filter="url(#shadow)"/>

      <!-- Inner Audio Wave Visualizer Bars / Rings -->
      <!-- Center Music Note / Waveform -->
      <g filter="url(#subtleGlow)">
        <!-- Dynamic Audio Waves -->
        <path d="M 176 256 Q 196 200, 216 256 T 256 256 T 296 256 T 336 256" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.95"/>
        <path d="M 196 256 Q 216 160, 236 256 T 276 256 T 316 256" fill="none" stroke="#fbcfe8" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
        
        <!-- Pulsing Center Node -->
        <circle cx="256" cy="256" r="16" fill="#ffffff" filter="url(#shadow)"/>
      </g>
    </svg>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background: transparent; overflow: hidden; display: flex; justify-content: center; align-items: center; }
          svg { width: 100vw; height: 100vh; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  
  // Wait a moment for rendering
  await new Promise(r => setTimeout(r, 400));

  const sizes = [512, 256, 128, 64, 48, 32, 16];
  const pngBuffers = [];

  const buildDir = path.join(__dirname, '..', 'build');
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  for (const size of sizes) {
    win.setSize(size, size);
    await new Promise(r => setTimeout(r, 100));
    const image = await win.capturePage();
    const resized = image.resize({ width: size, height: size, quality: 'best' });
    const pngBuf = resized.toPNG();
    pngBuffers.push({ width: size, height: size, buffer: pngBuf });

    if (size === 512) {
      fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuf);
      fs.writeFileSync(path.join(publicDir, 'icon.png'), pngBuf);
      fs.writeFileSync(path.join(publicDir, 'favicon.png'), pngBuf);
    }
  }

  // Generate multi-resolution ICO for Windows
  const icoBuf = createIcoFromPngs(pngBuffers.filter(p => p.width <= 256));
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuf);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);

  console.log('Successfully generated icons:');
  console.log(' - build/icon.ico');
  console.log(' - build/icon.png');
  console.log(' - public/icon.png');
  console.log(' - public/favicon.ico');

  app.quit();
});

