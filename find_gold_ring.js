import fs from 'fs';
import jpeg from 'jpeg-js';

const jpegData = fs.readFileSync('src/assets/images/ssk_fleet_official_logo_1786620180171.jpg');
const raw = jpeg.decode(jpegData, { useTolerantUnknown: true });
const width = raw.width;
const height = raw.height;
const cx = width / 2;
const cy = height / 2;

console.log('Center:', cx, cy);

// Ray trace along 36 angles to detect where gold ring turns to white
const radii = [];

for (let deg = 0; deg < 360; deg += 10) {
  const rad = (deg * Math.PI) / 180;
  let lastGoldOrDarkR = 0;

  for (let r = 0; r < 512; r++) {
    const x = Math.round(cx + r * Math.cos(rad));
    const y = Math.round(cy + r * Math.sin(rad));

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (width * y + x) * 4;
      const red = raw.data[idx];
      const green = raw.data[idx + 1];
      const blue = raw.data[idx + 2];

      // White background threshold: all RGB > 230 or R>220 & G>220 & B>220
      const isWhite = (red > 220 && green > 220 && blue > 220);

      if (!isWhite) {
        lastGoldOrDarkR = r;
      }
    }
  }
  radii.push(lastGoldOrDarkR);
  console.log(`Angle ${deg}°: Outer boundary r = ${lastGoldOrDarkR}`);
}

const avgR = radii.reduce((a, b) => a + b, 0) / radii.length;
const minR = Math.min(...radii);
const maxR = Math.max(...radii);

console.log(`Summary: avgR = ${avgR.toFixed(1)}, minR = ${minR}, maxR = ${maxR}`);
