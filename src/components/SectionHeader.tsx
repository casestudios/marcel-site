type Props = {
  index: string; // "01"
  label: string; // "THE HIDDEN PROBLEM"
  title: React.ReactNode;
  lead?: React.ReactNode;
};

/**
 * Section header rendered as a technical-drawing block: a part-number style
 * index tag, a datum rule, an editorial title, and an optional lead.
 */
export default function SectionHeader({ index, label, title, lead }: Props) {
  return (
    <div className="reveal max-w-3xl">
      <div className="flex items-center gap-4">
        <span className="tag tag-amber">§ {index}</span>
        <span className="tag">{label}</span>
      </div>
      <div className="datum mt-4 mb-7" />
      <h2 className="font-display text-[clamp(30px,5vw,58px)] tracking-tightest text-text">
        {title}
      </h2>
      {lead ? (
        <p className="mt-6 text-[clamp(16px,2.1vw,20px)] leading-relaxed text-text-dim">
          {lead}
        </p>
      ) : null}
    </div>
  );
}
