// One-off asset generator: rasterizes the OG card and apple icon from SVG.
// Run: node scripts/gen-images.mjs   (requires sharp; dev-only, not shipped)
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function svgToPng(svgPath, outPath, width, height) {
  const svg = await readFile(join(root, svgPath));
  await sharp(svg, { density: 300 })
    .resize(width, height, { fit: "fill" })
    .png()
    .toFile(join(root, outPath));
  console.log(`✓ ${outPath}  (${width}×${height})`);
}

await svgToPng("public/og.svg", "public/og.png", 1200, 630);
await svgToPng("src/app/icon.svg", "src/app/apple-icon.png", 180, 180);
console.log("done");
