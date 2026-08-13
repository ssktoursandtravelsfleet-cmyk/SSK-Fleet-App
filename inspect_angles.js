import fs from 'fs';
import jpeg from 'jpeg-js';

const jpegData = fs.readFileSync('src/assets/images/ssk_fleet_official_logo_1786620180171.jpg');
const raw = jpeg.decode(jpegData, { useTolerantUnknown: true });
const width = raw.width;

const cx = 512;
const cy = 512;

for (let deg = 0; deg < 360; deg += 45) {
  const rad = (deg * Math.PI) / 180;
  console.log(`--- Angle ${deg}° ---`);
  for (let r = 375; r <= 415; r += 2) {
    const x = Math.round(cx + r * Math.cos(rad));
    const y = Math.round(cy + r * Math.sin(rad));
    const idx = (width * y + x) * 4;
    console.log(`r=${r}: RGB(${raw.data[idx]}, ${raw.data[idx+1]}, ${raw.data[idx+2]})`);
  }
}
