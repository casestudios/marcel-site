# marcelcnc.com

Static site, no build step on deploy. Vercel serves the repo root; `.vercelignore` keeps `_src`, `_film` and this README off the live site.

## v5: machined monochrome
- **The stage.** A real-time 3D model of T02, the 1/2" three-flute rougher from Marcel's simulated run on November 2, 2026, in a CAT40 ER32 holder. Every part is built in code from real dimensions (`_src/shared/tool3d.js`); there are no 3D asset files. Scrolling runs the story: the load climbs, Marcel holds the feed, the tool opens up with Marcel's likely causes plotted on it, then the on-call phone. Replying restarts the cut.
- **The drawing.** "Your control stays off the network" is an isometric parts drawing generated as SVG (`_src/tools/drawing.mjs`) and plotted stroke by stroke in Hershey Simplex lettering. Hovering a row of the parts list highlights the part.
- **Plates.** `media/knoll*.webp` and `media/stand*.webp` are stills rendered from the same 3D model. `media/t02-*.webp` are the first-paint and reduced-motion posters.
- **Type.** Mona Sans and Hubot Sans (GitHub, OFL), Martian Mono (OFL) for data only, Hershey Simplex for plotted labels. All self-hosted.
- **Motion rules.** Nothing moves on its own with reduced motion on; the 3D is replaced by posters. The 3D renders only while it is on screen.

## Rebuild
```sh
cd _src && npm ci && node build.mjs
```
This regenerates `index.html`, `assets/js`, `assets/css` and `assets/fonts` at the repo root.

## The teaser film (`_film`)
A 25-second HyperFrames composition that reuses the same 3D module. Render it with:
```sh
cd _film && npx hyperframes render --output renders/marcel-teaser.mp4
```
Open it in the HyperFrames desktop app to edit the cards (they are composition variables).

## Honesty rules (unchanged)
Present tense only for what works. The film is labelled as where Marcel is headed. No customers, quotes, logos, prices or invented metrics. Calculator numbers are labelled as examples.
