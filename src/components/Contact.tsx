import { SITE } from "@/lib/site";

const subject = "Marcel";
const body =
  "Hi Shawn,\n\nI'd like to talk about Marcel.\n\nShop / organization:\nMachine builder and model:\nController, if known:\nWhat I'm interested in:\n\nBest way to reach me:\n";
export default function Contact() {
  return (
    <section id="contact" className="border-t border-line bg-panel/60">
      <div className="mx-auto max-w-frame px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="tag tag-amber">Get in touch</p>
            <h2 className="mt-6 text-[clamp(38px,6vw,72px)] font-black leading-[0.98]">
              Tell us what you run.
              <br />
              <span className="text-amber">We&apos;ll tell you where Marcel stands.</span>
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-text-dim">
              Marcel is built around FANUC controls first and is being tested
              against real equipment now. If you run something different, or
              want to see the display bridge on your floor, reach out.
            </p>
          </div>
          <div className="border-t border-amber/50 pt-6">
            <p className="text-base leading-relaxed text-text-dim">
              A short conversation is enough to start. You will get a straight
              answer on what works today and what is still in testing.
            </p>
            <a
              href={`mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
              className="button-primary mt-7"
            >
              Get in touch <span aria-hidden>↗</span>
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
