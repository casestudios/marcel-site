import { SITE } from "@/lib/site";

/**
 * A fixed, non-interactive overlay that frames the whole page like a technical
 * drawing sheet: registration corner ticks + an edge part-number label.
 */
export default function BlueprintFrame() {
  const corner = "absolute w-4 h-4 border-line-bright";
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 hidden md:block"
    >
      <div className="absolute inset-3 lg:inset-5">
        <span className={`${corner} left-0 top-0 border-l border-t`} />
        <span className={`${corner} right-0 top-0 border-r border-t`} />
        <span className={`${corner} left-0 bottom-0 border-l border-b`} />
        <span className={`${corner} right-0 bottom-0 border-r border-b`} />
      </div>
      <div className="absolute left-1 top-1/2 -translate-y-1/2 rotate-180 [writing-mode:vertical-rl] lg:left-2">
        <span className="tag text-xs tracking-widest text-text-faint">
          {SITE.partNo} · {SITE.rev}
        </span>
      </div>
    </div>
  );
}
