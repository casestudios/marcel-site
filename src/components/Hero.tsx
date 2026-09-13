import { SITE } from "@/lib/site";

export default function Hero() {
  return (
    <section
      id="top"
      className="relative mx-auto flex min-h-[90svh] max-w-frame flex-col justify-center px-5 pb-16 pt-28 md:px-8 md:pt-36"
    >
      <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="reveal flex flex-wrap items-center gap-3">
            <span className="h-2 w-2 bg-amber" />
            <span className="tag tag-amber">CNC shop software</span>
            <span className="border-l border-line-bright pl-3 font-mono text-xs text-text-dim">
              In development
            </span>
          </div>
          <h1 className="reveal mt-7 text-[clamp(44px,7vw,88px)] font-black leading-[0.94] tracking-tightest">
            The next step.
            <br />
            <span className="text-amber">Right at the</span>
            <br />
            <span className="text-amber">machine.</span>
          </h1>
          <p className="reveal mt-8 max-w-xl text-lg leading-relaxed text-text-dim md:text-xl">
            Machine observations. The right manuals. A service record your next
            shift can pick up. Marcel brings them together, starting with the
            phone in your pocket.
          </p>
          <div className="reveal mt-9 flex flex-wrap items-center gap-5">
            <a href="#demo" className="button-primary">
              Explore the workflow <span aria-hidden>↓</span>
            </a>
            <a href="#contact" className="link-amber py-3 font-mono text-sm">
              Bring your machine ↗
            </a>
          </div>
          <p className="reveal mt-7 max-w-md text-sm leading-relaxed text-text-dim">
            Working prototypes. Seeking our first shop trials.
          </p>
        </div>
        <div className="reveal">
          <div className="cut mx-auto max-w-[440px] border border-line-bright bg-panel p-2 shadow-[0_25px_80px_-35px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between gap-3 border-b border-line p-4 font-mono text-xs">
              <span className="font-bold tracking-widest">
                MARCEL / SERVICE
              </span>
              <span className="text-text-dim">Sample record</span>
            </div>
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-amber">
                <span className="h-2 w-2 bg-amber" /> NEEDS REVIEW
              </div>
              <div className="mt-5 flex items-end justify-between gap-4">
                <h2 className="text-4xl font-black">MILL 03</h2>
                <span className="font-mono text-xs text-text-dim">
                  CASE 024
                </span>
              </div>
              <p className="mt-3 text-base text-text-dim">
                Intermittent stop during warm-up
              </p>
              <div className="mt-6 border border-line bg-ink p-4">
                <div className="flex justify-between gap-2 font-mono text-xs text-text-dim">
                  <span>SCREEN OBSERVATION</span>
                  <span>08:42</span>
                </div>
                <p className="pendant mt-3 text-3xl">DEMO-01</p>
                <p className="mt-2 text-sm text-text-dim">
                  Alarm visible. Cause unconfirmed.
                </p>
              </div>
              <ol className="mt-6 space-y-4 text-sm">
                <li className="flex gap-3">
                  <span className="text-amber" aria-hidden>
                    ✓
                  </span>
                  <span>Observation added to the case</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-amber" aria-hidden>
                    ○
                  </span>
                  <span>Confirm controller and manual revision</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-text-dim" aria-hidden>
                    ○
                  </span>
                  <span className="text-text-dim">
                    Record checks and hand off to the next shift
                  </span>
                </li>
              </ol>
              <div className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-text-dim">
                Fictional machine and alarm. Marcel observes; your team operates
                the machine.
              </div>
            </div>
          </div>
          <div className="mx-auto mt-4 flex max-w-[440px] items-center gap-3 font-mono text-xs text-text-dim">
            <span className="h-px flex-1 bg-line-bright" />
            <span>ONE MACHINE. A CONTINUOUS RECORD.</span>
            <span className="h-px flex-1 bg-line-bright" />
          </div>
        </div>
      </div>
      <div className="reveal mt-16 flex flex-wrap justify-between gap-4 border-t border-line pt-6 font-mono text-xs tracking-wide text-text-dim">
        <span>{SITE.tagline}</span>
        <span className="text-amber">OBSERVE / UNDERSTAND / HAND OFF</span>
      </div>
    </section>
  );
}
