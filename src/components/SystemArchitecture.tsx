import SectionHeader from "./SectionHeader";

const coverage = [
  {
    family: "FANUC 0i Model D",
    state: "Initial manual set",
    detail:
      "Controller manuals available for prototype research. Exact machine configuration and builder documentation still need confirmation.",
  },
  {
    family: "Haas NGC / Siemens 828D",
    state: "Documentation research",
    detail:
      "Selected, edition-specific manuals are available for page search. This is not yet validated diagnosis support.",
  },
  {
    family: "Your machine",
    state: "Next shop trials",
    detail:
      "Tell us the builder, controller and the problem you want to solve. Repeated access to real equipment will guide what we support next.",
  },
];
export default function SystemArchitecture() {
  return (
    <section id="coverage" className="border-y border-line bg-panel/40">
      <div className="mx-auto max-w-frame px-5 py-20 md:px-8 md:py-28">
        <SectionHeader
          index="04"
          label="Machine coverage"
          title={
            <>
              Built for a mixed shop.
              <br />
              <span className="text-amber">Proven one setup at a time.</span>
            </>
          }
          lead="Screen access can open a path to older equipment. Compatibility depends on the actual display, controller, documentation and job."
        />
        <div className="mt-12 divide-y divide-line border-y border-line">
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
          Screen recognition is currently tested on synthetic displays.
          Real-machine validation is the next milestone. A readable screen does
          not by itself establish reliable monitoring or correct repair
          guidance.
        </p>
        <details className="mt-8 border border-line bg-ink/50 p-5 md:p-6">
          <summary className="cursor-pointer text-base font-semibold text-text">
            Further ahead: program delivery and recovery
          </summary>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-dim">
            We are exploring approved program delivery and narrowly defined
            recovery routines in isolated simulations. These are research
            directions. Live use would need a specific machine integration and
            engineering validation. They are not capabilities of the current
            observer.
          </p>
        </details>
      </div>
    </section>
  );
}
