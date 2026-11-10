import { textPath } from './hershey.mjs';
import fs from 'node:fs';
const lines = ['T02  1/2 IN 3-FLUTE ROUGHER', 'FEED HOLD  93%  SPINDLE TURNING', 'Tool life shows 37 left, not 300.', '0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
let y = 60, paths = '';
for (const [i, l] of lines.entries()) { const { d } = textPath(l, i === 2 ? 16 : 18, { x: 40, y }); paths += `<path d="${d}"/>`; y += 54; }
fs.writeFileSync(process.argv[2], `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="260" viewBox="0 0 900 260"><rect width="100%" height="100%" fill="#0a0a0b"/><g fill="none" stroke="#ecebe6" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`);
