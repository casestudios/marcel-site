const moments = [
  {
    time: "FRIDAY / AFTER HOURS",
    title: "Did the job keep running?",
    text: "A stopped machine and a lost view need different responses. Both deserve attention before Monday morning.",
  },
  {
    time: "AT THE CONTROL",
    title: "Where is the right information?",
    text: "The controller revision, the manual page, the last service note. Useful together, right where the question comes up.",
  },
  {
    time: "NEXT SHIFT",
    title: "What have we already tried?",
    text: "Give the next technician the observation, the checks and the open questions so the investigation can continue.",
  },
];
export default function Problem() {
  return (
    <section
      aria-label="Everyday shop questions"
      className="border-y border-line bg-panel/50"
    >
      <div className="mx-auto grid max-w-frame divide-y divide-line px-5 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8">
        {moments.map((item) => (
          <article
            key={item.time}
            className="py-9 first:pl-0 last:pr-0 md:px-7 md:py-12"
          >
            <p className="font-mono text-xs tracking-wider text-amber">
              {item.time}
            </p>
            <h2 className="mt-4 text-2xl leading-tight">{item.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-text-dim">
              {item.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
