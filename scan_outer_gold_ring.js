import fs from 'fs';
import jpeg from 'jpeg-js';

const jpegData = fs.readFileSync('src/assets/images/ssk_fleet_official_logo_1786620180171.jpg');
const raw = jpeg.decode(jpegData, { useTolerantUnknown: true });
const width = raw.width;
const height = raw.height;

// Center of image is (512, 512)
const cx = 512;
const cy = 512;

console.log('Scanning outer edge of gold ring (360 degrees):');

const outerRadii = [];

for (let deg = 0; deg < 360; deg += 5) {
  const rad = (deg * Math.PI) / 180;
  let outerR = 0;

  for (let r = 350; r <= 420; r++) {
    const x = Math.round(cx + r * Math.cos(rad));
    const y = Math.round(cy + r * Math.sin(rad));

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (width * y + x) * 4;
      const red = raw.data[idx];
      const green = raw.data[idx + 1];
      const blue = raw.data[idx + 2];

      // Check if it's NOT white background (white bg is R>230, G>230, B>225)
      const isBackground = (red > 225 && green > 225 && blue > 220);
      if (!isBackground) {
        outerR = r;
      }
    }
  }
  outerRadii.push(outerR);
}

const minR = Math.min(...outerRadii);
const maxR = Math.max(...outerRadii);
const avgR = outerRadii.reduce((a, b) => a + b, 0) / outerRadii.length;

console.log(`Outer gold ring bounds: minR = ${minR}, maxR = ${maxR}, avgR = ${avgR.toFixed(2)}`);
