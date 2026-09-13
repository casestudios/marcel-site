import SectionHeader from "./SectionHeader";

const products = [
  {
    number: "01",
    name: "Pocket",
    job: "Start with the screen.",
    status: "Working prototype",
    text: "Photograph a control screen to read visible alarm text and identify the controller. Unconfirmed identity or missing documentation stays visible.",
    detail: "Screen reading and machine identification",
    href: "#demo",
  },
  {
    number: "02",
    name: "Service cases",
    job: "Keep the investigation together.",
    status: "Working prototype",
    text: "Record observations and work, review linked manual references, and download a service handoff. A technician records the outcome.",
    detail: "Notes, case history and shift handoff",
    href: "#demo",
  },
  {
    number: "03",
    name: "Watch",
    job: "Know when the plan changes.",
    status: "In development",
    text: "Set expected run windows and surface unexpected stops or lost visibility. The next step is dependable observation and alerts on real machines.",
    detail: "Expected production and observation health",
    href: "#contact",
  },
  {
    number: "04",
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
        label="For your shop"
        title={
          <>
            One machine record.
            <br />
            <span className="text-amber">More ways to keep work moving.</span>
          </>
        }
        lead="Start with the job your team needs help with. Each workflow builds on the same machine and service history."
      />
      <div className="mt-12 grid gap-px overflow-hidden rounded-[6px] border border-line bg-line md:grid-cols-2">
        {products.map((product) => (
          <article
            key={product.name}
            className="flex flex-col bg-panel p-6 md:p-8"
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
        Marcel is in prototype development. Shop trials will establish supported
        machine configurations and practical reliability.
      </p>
    </section>
  );
}
