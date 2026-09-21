import SectionHeader from "./SectionHeader";

const products = [
  {
    number: "01",
    name: "Pocket",
    job: "Start with a photo of the screen.",
    status: "Working prototype",
    text: "Photograph a control screen. Marcel reads the visible alarm, identifies the controller family, and pulls the manual page where it has the documentation. Unconfirmed identity or missing documentation stays visible instead of being papered over.",
    detail: "Screen reading and machine identification",
    href: "#demo",
  },
  {
    number: "02",
    name: "Service cases",
    job: "Keep the investigation together.",
    status: "Working prototype",
    text: "Record observations and work, review linked manual references, and download a service handoff. A technician records the outcome. The next shift picks up where the last one stopped.",
    detail: "Notes, case history and shift handoff",
    href: "#demo",
  },
  {
    number: "03",
    name: "Display bridge",
    job: "Watch the screen, not the photo.",
    status: "In testing",
    text: "A small capture device on the control's display lets Marcel read the screen continuously, so an alarm is seen the moment it appears. Read-only by design. Proven on synthetic displays; now being tested against real controllers.",
    detail: "Continuous screen reading on real machines",
    href: "#coverage",
  },
  {
    number: "04",
    name: "Technician alerts",
    job: "Reach the right person.",
    status: "Built, integrating",
    text: "When an alarm is read, the diagnosis goes to a technician by message, routed by severity, with quiet hours for what can wait. The alert system exists today and is being connected to the display bridge.",
    detail: "Severity routing and shift-aware delivery",
    href: "#how",
  },
  {
    number: "05",
    name: "Passport",
    job: "The machine is the starting point.",
    status: "Planned",
    text: "Scan a machine QR code to reach its approved documents, setup information and service history. Access and document revisions belong with the record.",
    detail: "Machine QR pages and approved documents",
    href: "#contact",
  },
];
export default function Insight() {
  return (
    <section
      id="products"
      className="mx-auto max-w-frame px-5 py-20 md:px-8 md:py-28"
    >
      <SectionHeader
        index="01"
        label="What Marcel is"
        title={
          <>
            One machine record.
            <br />
            <span className="text-amber">Built up one piece at a time.</span>
          </>
        }
        lead="What works today, what is in testing, and what comes next. Every piece builds on the same machine and service history."
      />
      <div className="mt-12 grid gap-px overflow-hidden rounded-[6px] border border-line bg-line md:grid-cols-2">
        {products.map((product) => (
          <article
            key={product.name}
            className="flex flex-col bg-panel p-6 last:md:col-span-2 md:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-sm text-amber">
                /{product.number}
              </span>
              <span className="product-status">{product.status}</span>
            </div>
            <h3 className="mt-7 text-3xl font-black">{product.name}</h3>
            <p className="mt-3 text-lg text-text">{product.job}</p>
            <p className="mt-3 flex-1 text-base leading-relaxed text-text-dim">
              {product.text}
            </p>
            <a
              href={product.href}
              className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm text-text-dim hover:text-amber"
            >
              <span>{product.detail}</span>
              <span aria-hidden>↗</span>
            </a>
          </article>
        ))}
      </div>
      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-text-dim">
        Statuses are current as of this revision. Results from the display
        bridge on real controllers will be posted as they come in.
      </p>
    </section>
  );
}
