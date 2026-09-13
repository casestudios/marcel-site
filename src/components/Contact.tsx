import { SITE } from "@/lib/site";

const subject = "Marcel: first shop trial";
const body =
  "Hi Shawn,\n\nI'd like to talk about Marcel.\n\nShop / organization:\nMachine builder and model:\nController, if known:\nThe problem we'd like help with:\n\nBest way to reach me:\n";
export default function Contact() {
  return (
    <section id="contact" className="border-t border-line bg-panel/60">
      <div className="mx-auto max-w-frame px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="tag tag-amber">Help shape the first shop trials</p>
            <h2 className="mt-6 text-[clamp(38px,6vw,72px)] font-black leading-[0.98]">
              Bring a machine.
              <br />
              <span className="text-amber">Bring a real problem.</span>
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-text-dim">
              We are looking for shops and service teams willing to put the
              prototype in front of a technician. Tell us where work gets stuck
              and what equipment you use.
            </p>
          </div>
          <div className="border-t border-amber/50 pt-6">
            <p className="text-base leading-relaxed text-text-dim">
              A short conversation, one candidate machine and a supervised first
              look. We will work out the fit together.
            </p>
            <a
              href={`mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
              className="button-primary mt-7"
            >
              Talk about your shop <span aria-hidden>↗</span>
            </a>
            <p className="mt-4 text-sm text-text-dim">
              Opens your email app.{" "}
              <a className="link-amber break-all" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
            </p>
            {SITE.linkedin && (
              <a
                className="link-amber mt-4 inline-block text-sm"
                href={SITE.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
