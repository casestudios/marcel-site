import { SITE } from "@/lib/site";
export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-frame gap-6 px-5 py-9 md:grid-cols-[1fr_1.5fr_1fr] md:px-8">
        <a
          href="#top"
          className="font-mono text-sm font-bold tracking-widest text-text"
        >
          MARCEL <span className="font-normal text-amber">/ CNC</span>
        </a>
        <p className="text-sm leading-relaxed text-text-dim">
          Software for the next step at the machine.
          <br />
          In development. All examples on this site are synthetic.
        </p>
        <div className="font-mono text-xs leading-loose text-text-dim md:text-right">
          <p>{SITE.rev}</p>
          <p>© {new Date().getFullYear()} Marcel</p>
        </div>
      </div>
    </footer>
  );
}
