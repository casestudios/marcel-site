import SectionHeader from "./SectionHeader";

const observed = [
  {
    name: "Windows-based HMI",
    text: "The operator interface runs on a standard PC layer, not a closed panel.",
  },
  {
    name: "USB keyboard and mouse",
    text: "Standard input, which is what a KVM-style capture device speaks.",
  },
  {
    name: "Standard display connection",
    text: "An interchangeable monitor on a common video interface, so a capture device sits inline without modification.",
  },
];

const coverage = [
  {
    family: "FANUC 0i Model D",
    state: "Manual set indexed",
    detail:
      "Controller manuals indexed for cited diagnosis. Every line of an answer traces to a manual page, or it is not shown.",
  },
  {
    family: "Haas NGC / Siemens 828D",
    state: "Documentation research",
    detail:
      "Selected, edition-specific manuals are available for page search. Screen and controller identification works today; validated diagnosis support is next.",
  },
  {
    family: "Display bridge",
    state: "Testing on real controllers",
    detail:
      "Screen reading is proven on synthetic displays with zero false alarms across blurred, low-resolution and skewed captures. The next results come from real controllers with the capture bridge attached.",
  },
];
export default function SystemArchitecture() {
  return (
    <section id="coverage" className="border-y border-line bg-panel/40">
      <div className="mx-auto max-w-frame px-5 py-20 md:px-8 md:py-28">
        <SectionHeader
          index="04"
          label="Where it stands"
          title={
            <>
              The screen is the common interface.
              <br />
              <span className="text-amber">We checked at IMTS 2026.</span>
            </>
          }
          lead="Walking the floor at IMTS, the controls we looked at share the same three things. That includes current FANUC controls and OnLogic-based industrial PCs, and it very likely holds for other industry-standard panels. It means the display bridge does not depend on a network drop, a licensed protocol, or a builder integration."
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-[6px] border border-line bg-line md:grid-cols-3">
          {observed.map((item, i) => (
            <article key={item.name} className="bg-panel p-6 md:p-7">
              <span className="font-mono text-sm text-amber">0{i + 1}</span>
              <h3 className="mt-4 text-xl leading-tight">{item.name}</h3>
              <p className="mt-3 text-base leading-relaxed text-text-dim">
                {item.text}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-text-dim">
          This is what makes the approach reach the machines other tools
          cannot. Monitoring products built on a builder&apos;s protocol only see
          the machines that have the option installed and a network cable.
          The screen is on every one of them.
        </p>
        <div className="mt-14 divide-y divide-line border-y border-line">
          {coverage.map((item) => (
            <article
              key={item.family}
              className="grid gap-4 py-7 md:grid-cols-[1fr_1.5fr]"
            >
              <div>
                <h3 className="text-xl leading-tight">{item.family}</h3>
                <p className="mt-3 font-mono text-xs text-amber">
                  {item.state}
                </p>
              </div>
              <p className="text-base leading-relaxed text-text-dim">
                {item.detail}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm leading-relaxed text-text-dim">
          Synthetic-display results are not real-machine results, and a
          readable screen does not by itself establish repair guidance. That
          comes from the manual for the confirmed controller, cited page by
          page.
        </p>
        <details className="mt-8 border border-line bg-ink/50 p-5 md:p-6">
          <summary className="cursor-pointer text-base font-semibold text-text">
            Further ahead: guided recovery
          </summary>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-dim">
            The standard USB input on the controls we saw makes narrowly
            defined, technician-approved actions technically possible on those
            machines. We are exploring this only in isolated simulation. Live
            use would need a specific machine integration and engineering
            validation, and the technician stays in charge of every step. It
            is not a capability of the current bridge, which sends nothing to
            the machine.
          </p>
        </details>
      </div>
    </section>
  );
}
