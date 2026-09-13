# Marcel CNC website

The public-facing website for Marcel, built with Next.js and a static export.
Its control-panel theme uses graphite surfaces, an amber accent and a technical grid.

## Development

```sh
npm install
npm run dev
npm run lint
npm run build
```

The production website is generated in `out/`. The site has no application API,
manual corpus or customer data. All interactive examples are fictional and run
in browser memory. Reloading resets the sample case. The downloadable handoff
contains only the selected example and the notes entered into that example.

## Content

- Pocket screen reading and Service Cases are labeled working prototypes.
- Watch is in development; Passport is planned.
- The machine coverage section distinguishes manual research from validation.
- Program delivery and recovery are described only as future research.
- The contact link opens a prefilled email to the address in `src/lib/site.ts`.
  Inbox delivery must be verified separately by the owner.

The source stays separate from the private Marcel application repository.
Do not copy real manuals, customer screens, credentials or shop records here.
The existing social-preview artwork is retained.

The Sites configuration in `.openai/hosting.json` provides a private review URL.
The existing Vercel/custom-domain setup is independent of that review publication.
