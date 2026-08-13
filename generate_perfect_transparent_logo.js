import fs from 'fs';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const jpegData = fs.readFileSync('src/assets/images/ssk_fleet_official_logo_1786620180171.jpg');
const raw = jpeg.decode(jpegData, { useTolerantUnknown: true });

const width = raw.width; // 1024
const height = raw.height; // 1024

const cx = 512;
const cy = 512;
const rGold = 378; // Exact outer radius of gold ring

// Output size 760x760 (380px radius * 2 = 760)
const outSize = 760;
const outCx = 380;
const outCy = 380;

const png = new PNG({ width: outSize, height: outSize });

for (let py = 0; py < outSize; py++) {
  for (let px = 0; px < outSize; px++) {
    const origX = Math.round(cx - outCx + px);
    const origY = Math.round(cy - outCy + py);

    const outIdx = (outSize * py + px) * 4;

    if (origX < 0 || origX >= width || origY < 0 || origY >= height) {
      png.data[outIdx] = 0;
      png.data[outIdx + 1] = 0;
      png.data[outIdx + 2] = 0;
      png.data[outIdx + 3] = 0;
    } else {
      const origIdx = (width * origY + origX) * 4;
      const red = raw.data[origIdx];
      const green = raw.data[origIdx + 1];
      const blue = raw.data[origIdx + 2];

      const dist = Math.hypot(px - outCx, py - outCy);

      let alpha = 255;
      if (dist <= 376.5) {
        alpha = 255;
      } else if (dist >= 378.5) {
        alpha = 0;
      } else {
        // Anti-aliased transition edge
        alpha = Math.round(255 * (1 - (dist - 376.5) / 2));
      }

      // Extra check: if pixel near the edge (dist > 370) is background white/grey, make transparent
      if (dist > 370) {
        const isLightBg = (red > 200 && green > 200 && blue > 190);
        if (isLightBg) {
          alpha = 0;
        }
      }

      png.data[outIdx] = red;
      png.data[outIdx + 1] = green;
      png.data[outIdx + 2] = blue;
      png.data[outIdx + 3] = alpha;
    }
  }
}

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
  console.log(`Saved transparent PNG logo to ${target} (${buffer.length} bytes, ${outSize}x${outSize})`);
}

// Copy to Android resources as well
const androidDirs = [
  'android/app/src/main/res/mipmap-mdpi',
  'android/app/src/main/res/mipmap-hdpi',
  'android/app/src/main/res/mipmap-xhdpi',
  'android/app/src/main/res/mipmap-xxhdpi',
  'android/app/src/main/res/mipmap-xxxhdpi',
  'android/app/src/main/res/drawable'
];

for (const dir of androidDirs) {
  if (fs.existsSync(dir)) {
    fs.writeFileSync(`${dir}/ic_launcher.png`, buffer);
    fs.writeFileSync(`${dir}/ic_launcher_round.png`, buffer);
    fs.writeFileSync(`${dir}/ic_launcher_foreground.png`, buffer);
    fs.writeFileSync(`${dir}/splash.png`, buffer);
  }
}

console.log('Successfully generated transparent SSK logo assets across web and Android resources!');
