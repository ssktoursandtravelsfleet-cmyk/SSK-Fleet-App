import fs from 'fs';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const jpegData = fs.readFileSync('src/assets/images/ssk_fleet_official_logo_1786620180171.jpg');
const rawImageData = jpeg.decode(jpegData, { useTolerantUnknown: true });

const width = rawImageData.width;
const height = rawImageData.height;

console.log(`Original image size: ${width}x${height}`);

// Find top, bottom, left, right bounds of non-white emblem pixels
let minX = width, maxX = 0, minY = height, maxY = 0;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (width * y + x) * 4;
    const r = rawImageData.data[idx];
    const g = rawImageData.data[idx + 1];
    const b = rawImageData.data[idx + 2];

    // White background threshold (R>245, G>245, B>245)
    const isBackground = (r > 240 && g > 240 && b > 240);
    if (!isBackground) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log(`Emblem bounds: X[${minX}..${maxX}], Y[${minY}..${maxY}]`);

const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;
const diameterX = maxX - minX;
const diameterY = maxY - minY;
const radius = Math.max(diameterX, diameterY) / 2;

console.log(`Center: (${cx.toFixed(1)}, ${cy.toFixed(1)}), Radius: ${radius.toFixed(1)}`);

// Create a tightly-cropped square PNG centered on the circular emblem
// Add 4px padding around the circle so edge pixels don't clip
const pad = 4;
const cropSize = Math.ceil((radius + pad) * 2);
const png = new PNG({ width: cropSize, height: cropSize });

const cropCx = cropSize / 2;
const cropCy = cropSize / 2;

for (let py = 0; py < cropSize; py++) {
  for (let px = 0; px < cropSize; px++) {
    // Map (px, py) back to original image space (origX, origY)
    const origX = Math.round(cx - cropCx + px);
    const origY = Math.round(cy - cropCy + py);

    const outIdx = (cropSize * py + px) * 4;

    if (origX < 0 || origX >= width || origY < 0 || origY >= height) {
      // Outside original image -> fully transparent
      png.data[outIdx] = 0;
      png.data[outIdx + 1] = 0;
      png.data[outIdx + 2] = 0;
      png.data[outIdx + 3] = 0;
    } else {
      const origIdx = (width * origY + origX) * 4;
      const rVal = rawImageData.data[origIdx];
      const gVal = rawImageData.data[origIdx + 1];
      const bVal = rawImageData.data[origIdx + 2];

      // Distance from center of circle in cropped space
      const dist = Math.hypot(px - cropCx, py - cropCy);

      // Smooth anti-aliasing transition at radius
      // dist <= radius - 1 => alpha = 255
      // dist >= radius + 1 => alpha = 0
      // in between => linear interpolation
      let alpha = 255;
      if (dist > radius - 1) {
        if (dist >= radius + 1) {
          alpha = 0;
        } else {
          alpha = Math.round(255 * (1 - (dist - (radius - 1)) / 2));
        }
      }

      // Also if pixel is white/near-white outside radius - 3, make it transparent
      if (dist > radius - 3 && rVal > 235 && gVal > 235 && bVal > 235) {
        alpha = 0;
      }

      png.data[outIdx] = rVal;
      png.data[outIdx + 1] = gVal;
      png.data[outIdx + 2] = bVal;
      png.data[outIdx + 3] = alpha;
    }
  }
}

// Write to files
const buffer = PNG.sync.write(png);

const targets = [
  'public/ssk_logo.png',
  'public/logo.png',
  'public/favicon.png',
  'src/assets/images/logo.png',
  'src/assets/images/ssk_official_logo.png'
];

for (const target of targets) {
  fs.writeFileSync(target, buffer);
  console.log(`Saved transparent PNG to ${target} (${buffer.length} bytes)`);
}

console.log('Finished generating transparent PNG logo!');
