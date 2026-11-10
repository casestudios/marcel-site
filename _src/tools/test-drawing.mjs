import { buildDrawing } from './drawing.mjs';
import fs from 'node:fs';
const css = `
body{margin:0;background:#e7e8e6}
svg{display:block}
.fl{fill:#e7e8e6;stroke:none}
.pl{fill:none;stroke:#111214;stroke-linecap:round;stroke-linejoin:round}
.obj{stroke-width:1.7}.edge{stroke-width:1.1}.det{stroke-width:.85}.hid{stroke-width:.8;stroke-dasharray:5 4}
.scr{stroke-width:.8;opacity:.75}.cab{stroke-width:1.35}.key{stroke-width:1.2;stroke-dasharray:7 5}
.air{stroke-width:1;stroke-dasharray:3 4}.cross{stroke-width:2.2;stroke:#c8321f}
.bal{stroke-width:1.1}.lead{stroke-width:.8}.btxt{stroke-width:1.15}.txt,.note{stroke-width:1}`;
for (const v of ['wide', 'tall']) {
  const d = buildDrawing(v);
  const [x, y, w, h] = d.viewBox.split(' ').map(Number);
  const html = `<!doctype html><html><head><style>${css}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" viewBox="${d.viewBox}" width="${v === 'wide' ? 1400 : 390}">${d.body}</svg></body></html>`;
  fs.writeFileSync(`ld/drawing-${v}.html`, html);
  console.log(v, d.viewBox, d.count, 'strokes');
}
