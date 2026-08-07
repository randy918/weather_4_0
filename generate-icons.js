const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PUBLIC_DIR = path.join(__dirname, 'public');
const TEMP_DIR = path.join(__dirname, 'temp_icons');

const squareSvgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 102.69 102.69">
  <defs>
    <style>
      .st0 {
        fill: #c1272d;
      }
    </style>
  </defs>
  <g id="jYUWT6" transform="translate(0, 16.14)">
    <g>
      <path class="st0" d="M31.73,70.4c5.03-.11,8.77-2.4,11.23-6.38,2.27-3.68,3.04-7.84,1.3-12.03L26.02,8.02C24.01,3.17,19.76.45,14.73.05,10.07-.32,6.05,1.4,3.18,5.04.1,8.97-.99,13.9,1.01,18.75l18.05,43.75c2.16,5.23,6.95,8.03,12.67,7.9ZM67.72,70.39c5.21-.13,9.18-2.65,11.47-7.02,1.71-3.26,2.44-7.18.94-10.86L61.81,7.77C59.84,2.94,55.3.33,50.36.04s-9.02,1.73-11.83,5.62c-2.63,3.63-3.63,8.17-1.81,12.56l18.5,44.54c2.12,5.11,6.96,7.77,12.5,7.63ZM100.49,30.93c2.15-3.8,2.98-8.14,1.3-12.16l-4.82-11.46c-1.89-4.49-6.08-6.83-10.75-7.25-5.09-.45-9.52,1.51-12.39,5.77-2.26,3.34-3.37,7.49-1.87,11.47l4.78,12.68c1.81,4.8,6.33,7.4,11.26,7.74,5.33.37,9.81-2.04,12.5-6.79Z"/>
      <path class="st0" d="M31.73,70.4c-5.72.12-10.51-2.67-12.67-7.9L1.01,18.75C-.99,13.9.1,8.97,3.18,5.04,6.05,1.4,10.07-.32,14.73.05c5.04.4,9.28,3.12,11.3,7.97l18.24,43.97c1.74,4.19.97,8.35-1.3,12.03-2.46,3.98-6.2,6.27-11.23,6.38Z"/>
      <path class="st0" d="M67.72,70.39c-5.54.14-10.38-2.52-12.5-7.63l-18.5-44.54c-1.82-4.39-.82-8.93,1.81-12.56C41.34,1.77,45.48-.25,50.36.04s9.48,2.9,11.46,7.74l18.31,44.74c1.51,3.68.77,7.6-.94,10.86-2.29,4.37-6.26,6.89-11.47,7.02Z"/>
      <path class="st0" d="M100.49,30.93c-2.69,4.75-7.16,7.16-12.5,6.79-4.92-.34-9.44-2.94-11.26-7.74l-4.78-12.68c-1.5-3.98-.39-8.13,1.87-11.47,2.88-4.26,7.3-6.22,12.39-5.77,4.67.41,8.86,2.75,10.75,7.25l4.82,11.46c1.69,4.01.86,8.35-1.3,12.16Z"/>
    </g>
  </g>
</svg>`;

// Packages raw PNG buffers into a single ICO file
function createIco(pngBuffers, sizes) {
  const numImages = pngBuffers.length;
  
  // Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(numImages, 4); // Number of images

  const directorySize = 16 * numImages;
  const entries = [];
  let currentOffset = 6 + directorySize;

  for (let i = 0; i < numImages; i++) {
    const png = pngBuffers[i];
    const size = sizes[i];
    const sizeByte = size >= 256 ? 0 : size;

    const entry = Buffer.alloc(16);
    entry.writeUInt8(sizeByte, 0); // Width
    entry.writeUInt8(sizeByte, 1); // Height
    entry.writeUInt8(0, 2); // Color palette count (0 for truecolor PNG)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes (1)
    entry.writeUInt16LE(32, 6); // Bits per pixel (32)
    entry.writeUInt32LE(png.length, 8); // Size of image data
    entry.writeUInt32LE(currentOffset, 12); // Offset of image data

    entries.push(entry);
    currentOffset += png.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

function runSips(svgPath, size, outPath) {
  const cmd = 'sips -s format png -z ' + size + ' ' + size + ' "' + svgPath + '" --out "' + outPath + '"';
  console.log('Executing: ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  console.log('Generating transparent icon assets...');

  // Ensure public directory exists
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // Ensure temp directory exists
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // 1. Write public/favicon.svg
  const svgPath = path.join(PUBLIC_DIR, 'favicon.svg');
  fs.writeFileSync(svgPath, squareSvgContent, 'utf8');
  console.log('Saved: ' + svgPath);

  // 2. Generate PNGs
  const targets = [
    { size: 96, name: 'favicon-96x96.png', dest: PUBLIC_DIR },
    { size: 180, name: 'apple-touch-icon.png', dest: PUBLIC_DIR },
    { size: 192, name: 'web-app-manifest-192x192.png', dest: PUBLIC_DIR },
    { size: 512, name: 'web-app-manifest-512x512.png', dest: PUBLIC_DIR },
    // Temp sizes for ICO
    { size: 16, name: 'temp-16.png', dest: TEMP_DIR },
    { size: 32, name: 'temp-32.png', dest: TEMP_DIR },
    { size: 48, name: 'temp-48.png', dest: TEMP_DIR },
  ];

  for (const t of targets) {
    const outPath = path.join(t.dest, t.name);
    runSips(svgPath, t.size, outPath);
    console.log('Generated: ' + outPath);
  }

  // 3. Package ICO
  const icoSizes = [16, 32, 48];
  const pngBuffers = icoSizes.map(size => {
    const p = path.join(TEMP_DIR, 'temp-' + size + '.png');
    return fs.readFileSync(p);
  });

  const icoBuffer = createIco(pngBuffers, icoSizes);
  const icoPath = path.join(PUBLIC_DIR, 'favicon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Created: ' + icoPath);

  // 4. Clean up temp files
  for (const size of icoSizes) {
    fs.unlinkSync(path.join(TEMP_DIR, 'temp-' + size + '.png'));
  }
  fs.rmdirSync(TEMP_DIR);
  console.log('Cleaned up temporary icon directory.');
  console.log('All transparent icon assets successfully generated!');
}

main();
