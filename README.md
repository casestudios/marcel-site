# marcelcnc.com

The Marcel website: one static page with no build step.

## Run it locally

    python3 -m http.server 8000

Then open http://localhost:8000. Opening `index.html` straight from the file system works too, but browsers block web fonts there, so the type falls back to Arial.

## Deploy

Pushing to `main` deploys to production on Vercel. `vercel.json` tells Vercel this is a plain static site with no framework and no build. To undo a deploy, use Instant Rollback on the previous deployment in the Vercel dashboard.

## What's where

- `index.html`: the page and all of its copy.
- `assets/site.css`: all of the page's style.
- `assets/site.js`: the header, smooth scrolling, the film and its log, the recording tabs, the ladder and the phone menu.
- `assets/fx.js`: the effects:
  - the hero's scan and toolpath;
  - the film's glow;
  - the night clock;
  - the rolling numbers and charts;
  - the calculator;
  - the machined wordmark.
- `assets/console.js`: the "Run it yourself" console, a redraw of the November 2, 2026 simulated run. Marcel's two texts are copied word for word from that run.
- `assets/palette.js`: the command menu (Cmd K or Ctrl K).
- `assets/vendor/`: GSAP 3.13.0 (with ScrollTrigger, SplitText and ScrambleTextPlugin) and Lenis 1.1.13.
- `assets/fonts/`: self-hosted Barlow, Barlow Semi Condensed and IBM Plex Mono (SIL Open Font License).
- `media/`: the film, the recordings, the photos and the posters.

The previous Next.js version of the site is in this repository's history.
