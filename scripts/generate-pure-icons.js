const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table & calculator
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function encodeRGBAtoPNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // deflate
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // no interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0 (None)
  const scanlineLength = 1 + width * 4;
  const rawScanlines = Buffer.alloc(height * scanlineLength);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawScanlines[rowOffset] = 0; // Filter: None
    const rgbaOffset = y * width * 4;
    rgbaBuffer.copy(rawScanlines, rowOffset + 1, rgbaOffset, rgbaOffset + width * 4);
  }

  const deflated = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate Aura Logo RGBA Buffer: Deep dark background squircle, vibrant purple/violet/magenta glowing orb & sound wave
function renderAuraLogo(size) {
  const buf = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size * 0.44;
  const cornerRadius = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Distance from center
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Squircle distance check for rounded app background
      const qx = Math.max(0, Math.abs(dx) - (center - cornerRadius));
      const qy = Math.max(0, Math.abs(dy) - (center - cornerRadius));
      const cornerDist = Math.sqrt(qx * qx + qy * qy);
      const isInsideApp = cornerDist <= cornerRadius;

      if (!isInsideApp) {
        // Transparent outside
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Base app background color (dark obsidian #0b0c16 with subtle radial gradient)
      const bgFactor = Math.min(1, dist / (center * 1.2));
      let r = Math.round(18 * (1 - bgFactor) + 8 * bgFactor);
      let g = Math.round(14 * (1 - bgFactor) + 6 * bgFactor);
      let b = Math.round(36 * (1 - bgFactor) + 18 * bgFactor);
      let a = 255;

      // Outer glowing ring
      const ringDist = Math.abs(dist - size * 0.36);
      if (ringDist < size * 0.035) {
        const ringIntensity = (1 - ringDist / (size * 0.035));
        r = Math.min(255, r + Math.round(168 * ringIntensity * 0.7));
        g = Math.min(255, g + Math.round(85 * ringIntensity * 0.7));
        b = Math.min(255, b + Math.round(247 * ringIntensity * 0.7));
      }

      // Central vibrant orb (Violet to Purple to Pink glow)
      const orbRadius = size * 0.26;
      if (dist <= orbRadius) {
        const t = dist / orbRadius;
        // Inner gradient: Bright electric violet (#c084fc -> #9333ea -> #6366f1)
        const orbR = Math.round(210 * (1 - t * 0.6));
        const orbG = Math.round(130 * (1 - t * 0.8));
        const orbB = Math.round(255);
        
        // Blend orb over background
        const alpha = Math.min(1, (1 - t * t * 0.4));
        r = Math.round(r * (1 - alpha) + orbR * alpha);
        g = Math.round(g * (1 - alpha) + orbG * alpha);
        b = Math.round(b * (1 - alpha) + orbB * alpha);
      }

      // Central sound wave / pulse bars
      // 5 vertical visualizer bars in the center
      const barWidth = size * 0.04;
      const barGap = size * 0.06;
      const barHeights = [0.08, 0.16, 0.24, 0.16, 0.08].map(h => h * size);
      
      for (let bIdx = 0; bIdx < 5; bIdx++) {
        const barCenterX = center + (bIdx - 2) * barGap;
        const barHalfHeight = barHeights[bIdx] / 2;
        const barDistX = Math.abs(x - barCenterX);
        const barDistY = Math.abs(y - center);

        if (barDistX <= barWidth / 2 && barDistY <= barHalfHeight) {
          // Inside music visualizer bar - Crisp glowing white/pink
          const edgeFactor = Math.min(1, (barWidth / 2 - barDistX) / 1.5);
          r = Math.round(255 * edgeFactor + r * (1 - edgeFactor));
          g = Math.round(255 * edgeFactor + g * (1 - edgeFactor));
          b = Math.round(255 * edgeFactor + b * (1 - edgeFactor));
        }
      }

      buf[idx] = Math.min(255, Math.max(0, r));
      buf[idx + 1] = Math.min(255, Math.max(0, g));
      buf[idx + 2] = Math.min(255, Math.max(0, b));
      buf[idx + 3] = a;
    }
  }

  return buf;
}

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let currentOffset = headerSize;
  const entries = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(item.buffer.length, 8);
    entry.writeUInt32LE(currentOffset, 12);
    entries.push(entry);
    currentOffset += item.buffer.length;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

// Generate all target sizes
const sizes = [256, 128, 64, 48, 32, 16];
const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const pngItems = [];

for (const size of sizes) {
  const rgba = renderAuraLogo(size);
  const png = encodeRGBAtoPNG(size, size, rgba);
  pngItems.push({ width: size, height: size, buffer: png });
  
  if (size === 256) {
    fs.writeFileSync(path.join(buildDir, 'icon.png'), png);
    fs.writeFileSync(path.join(publicDir, 'icon.png'), png);
    fs.writeFileSync(path.join(publicDir, 'favicon.png'), png);
  }
}

// Write high-res 512x512 PNG
const rgba512 = renderAuraLogo(512);
const png512 = encodeRGBAtoPNG(512, 512, rgba512);
fs.writeFileSync(path.join(buildDir, 'icon-512.png'), png512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

// Build multi-layer Windows ICO
const icoBuf = createIco(pngItems);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuf);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);

console.log('✅ Generated all icons successfully:');
console.log(' - build/icon.ico (256, 128, 64, 48, 32, 16 multi-layer)');
console.log(' - build/icon.png (256x256)');
console.log(' - build/icon-512.png (512x512)');
console.log(' - public/icon.png & public/favicon.ico');

