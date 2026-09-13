import SectionHeader from "./SectionHeader";
const teams = [
  {
    number: "01",
    name: "The small shop",
    text: "A phone at the machine, useful documentation and a record of what happened. Start with a single workflow worth returning to.",
  },
  {
    number: "02",
    name: "The maintenance team",
    text: "Keep an investigation understandable across technicians and shifts. Review observations, reported work and outstanding questions together.",
  },
  {
    number: "03",
    name: "The service organization",
    text: "Prepare a clearer handoff before the support call. Help shape future collaboration across customers, sites and service teams.",
  },
];
export default function Audience() {
  return (
    <section className="mx-auto max-w-frame px-5 py-20 md:px-8 md:py-28">
      <SectionHeader
        index="05"
        label="Small shop. Larger operation."
        title={
          <>
            Start at one machine.
            <br />
            <span className="text-text-dim">Build around your team.</span>
          </>
        }
      />
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {teams.map((team) => (
          <article key={team.name}>
            <p className="font-mono text-sm text-amber">/{team.number}</p>
            <h3 className="mt-4 text-2xl">{team.name}</h3>
            <p className="mt-4 text-base leading-relaxed text-text-dim">
              {team.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
