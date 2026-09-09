import SectionHeader from "./SectionHeader";

const steps = [
  {
    name: "Observe",
    text: "Start with a phone photo. An installed observer is another path where the machine and capture setup support it.",
  },
  {
    name: "Confirm",
    text: "Check the machine, controller and document revision. A familiar brand name alone does not establish the right manual.",
  },
  {
    name: "Investigate",
    text: "Keep the alarm, source references and technician checks together. Unanswered questions stay part of the case.",
  },
  {
    name: "Hand off",
    text: "Record what was done and the reported result. Download the context the next shift or service technician needs.",
  },
];
export default function HowItWorks() {
  return (
    <section
      id="how"
      className="mx-auto max-w-frame px-5 py-20 md:px-8 md:py-28"
    >
      <SectionHeader
        index="03"
        label="From screen to service record"
        title={
          <>
            Keep the context.
            <br />
            <span className="text-text-dim">Through every shift.</span>
          </>
        }
      />
      <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.name} className="border-t border-line-bright pt-5">
            <span className="font-mono text-sm text-amber">0{i + 1}</span>
            <h3 className="mt-5 text-2xl">{step.name}</h3>
            <p className="mt-3 text-base leading-relaxed text-text-dim">
              {step.text}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-12 flex flex-col gap-3 border-l-2 border-amber bg-panel p-6 md:flex-row md:gap-8">
        <h3 className="shrink-0 text-xl leading-tight">
          Your team stays in control.
        </h3>
        <p className="max-w-2xl text-base text-text-dim">
          The current observer is read-only. It sends no machine commands. An
          alarm disappearing is an observation; a repair outcome is a separate
          technician report.
        </p>
      </div>
    </section>
  );
}
