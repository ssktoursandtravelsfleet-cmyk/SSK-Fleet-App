import fs from 'fs';
import jpeg from 'jpeg-js';

const jpegData = fs.readFileSync('src/assets/images/ssk_fleet_official_logo_1786620180171.jpg');
const raw = jpeg.decode(jpegData, { useTolerantUnknown: true });
const width = raw.width;
const height = raw.height;

console.log('Sample pixels from center (512,512) outwards along x-axis (right):');
for (let x = 300; x <= 512; x += 10) {
  const idx = (width * 512 + x) * 4;
  console.log(`x=${x}: RGB(${raw.data[idx]}, ${raw.data[idx+1]}, ${raw.data[idx+2]})`);
}
