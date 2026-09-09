# Website refresh: September 9, 2026

The website now addresses CNC shop workflows using the existing graphite,
amber and technical-grid theme. It includes Pocket, Service Cases, Watch and
Passport with distinct development statuses, a coverage overview, research
boundaries and a contact link for initial shop trials.

The interactive example uses fictional machines and documents. Visitors can
switch between an alarm, a missing observation and unknown controller identity;
open a sample case; add a note; report an outcome; reopen it; and download a
plain-text handoff. It has no connection to the production application or a CNC.

## Validation

- Next.js production export, TypeScript and ESLint checks passed.
- Phone layout checked at 390 pixels with no horizontal overflow.
- Phone navigation opens and closes around section links.
- Empty reports cannot resolve a case. HTML-like notes render as text.
- Note recording, explicit resolution, reopening, scenario reset and loss-of-view
  handling were exercised in the browser.
- The downloaded sample handoff was inspected for the observation, note, reported
  outcome and fictional document notice.
- Current manual coverage and missing identity remain explicit.

## Publication and limits

The Sites publication is a private review of the static export. The Vercel/custom
domain deployment is separate. `NEXT_PUBLIC_SITE_URL` sets the public origin for
review builds; without it, metadata uses marcelcnc.com.

No real-machine performance or repair correctness was established. The contact
link uses the existing hello@marcelcnc.com configuration; inbox receipt was not
tested. The existing social-preview artwork is retained. The former hardcoded
repair-demo dataset was archived outside this website in the ignored application
data directory and is absent from the site source and export.
