import fs from 'fs';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const jpegData = fs.readFileSync('src/assets/images/ssk_fleet_official_logo_1786620180171.jpg');
const rawImageData = jpeg.decode(jpegData, { useTolerantUnknown: true });

console.log('Image dimensions:', rawImageData.width, 'x', rawImageData.height);

const width = rawImageData.width;
const height = rawImageData.height;
const png = new PNG({ width, height });

// Let's find the exact bounding box or circle of the logo emblem.
// The logo is a circle centered in the image with gold outer ring and white background outside.

const centerX = width / 2;
const centerY = height / 2;

// Let's sample colors along a ray from center to edge to detect where the gold ring ends and white background begins.
let detectedRadius = 0;
for (let r = Math.min(width, height) / 2; r > 0; r--) {
  // sample pixels at radius r
  let whiteCount = 0;
  let samples = 36;
  for (let i = 0; i < samples; i++) {
    const angle = (i * 2 * Math.PI) / samples;
    const x = Math.round(centerX + r * Math.cos(angle));
    const y = Math.round(centerY + r * Math.sin(angle));
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (width * y + x) * 4;
      const red = rawImageData.data[idx];
      const green = rawImageData.data[idx + 1];
      const blue = rawImageData.data[idx + 2];
      // Check if it's white / off-white background (R>240, G>240, B>240)
      if (red > 235 && green > 235 && blue > 235) {
        whiteCount++;
      }
    }
  }
  if (whiteCount < samples * 0.2) {
    detectedRadius = r;
    break;
  }
}

console.log('Detected emblem radius:', detectedRadius);
