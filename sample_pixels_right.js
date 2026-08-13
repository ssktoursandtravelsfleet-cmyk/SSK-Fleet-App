import fs from 'fs';
import jpeg from 'jpeg-js';

const jpegData = fs.readFileSync('src/assets/images/ssk_fleet_official_logo_1786620180171.jpg');
const raw = jpeg.decode(jpegData, { useTolerantUnknown: true });
const width = raw.width;

console.log('Pixels from center x=512 to right edge x=950 along y=512:');
for (let x = 512; x <= 950; x += 10) {
  const idx = (width * 512 + x) * 4;
  console.log(`x=${x} (r=${x-512}): RGB(${raw.data[idx]}, ${raw.data[idx+1]}, ${raw.data[idx+2]})`);
}
