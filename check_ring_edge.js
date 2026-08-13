import fs from 'fs';
import jpeg from 'jpeg-js';

const jpegData = fs.readFileSync('src/assets/images/ssk_fleet_official_logo_1786620180171.jpg');
const raw = jpeg.decode(jpegData, { useTolerantUnknown: true });
const width = raw.width;
const height = raw.height;
const cx = 512;
const cy = 512;

for (let r = 460; r <= 500; r += 5) {
  let goldCount = 0;
  let navyCount = 0;
  let whiteCount = 0;

  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const x = Math.round(cx + r * Math.cos(rad));
    const y = Math.round(cy + r * Math.sin(rad));

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (width * y + x) * 4;
      const red = raw.data[idx];
      const green = raw.data[idx + 1];
      const blue = raw.data[idx + 2];

      if (red > 200 && green > 200 && blue > 200) {
        whiteCount++;
      } else if (red > 150 && green > 110 && blue < 100) {
        // Gold pixel
        goldCount++;
      } else {
        navyCount++;
      }
    }
  }
  console.log(`Radius ${r}px: Gold = ${goldCount}, Navy = ${navyCount}, White = ${whiteCount}`);
}
