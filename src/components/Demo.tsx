"use client";

import { useState } from "react";
import SectionHeader from "./SectionHeader";

const examples = [
  {
    id: "alarm",
    label: "An alarm appears",
    machine: "MILL 03",
    title: "Intermittent stop during warm-up",
    signal: "DEMO-01",
    state: "Alarm observed",
    observation:
      "The sample screen shows an alarm. Its cause and the machine's physical condition are unconfirmed.",
    identity: "Training controller / Revision A",
    document: true,
  },
  {
    id: "lost",
    label: "The view goes missing",
    machine: "LATHE 02",
    title: "Observation lost during an expected run",
    signal: "VIEW LOST",
    state: "Current state unknown",
    observation:
      "The last sample image showed a running indication at 20:42. No fresh image has arrived. That earlier image cannot establish the current machine state.",
    identity: "Training controller / Revision A",
    document: true,
  },
  {
    id: "unknown",
    label: "The control is unfamiliar",
    machine: "MILL 07",
    title: "Confirm the controller before looking up guidance",
    signal: "DEMO-02",
    state: "Identity unconfirmed",
    observation:
      "An alarm identifier is visible in the sample. The controller generation and applicable manual have not been confirmed.",
    identity: "Controller revision unconfirmed",
    document: false,
  },
] as const;

type Entry = { kind: string; text: string };
type CaseState = "preview" | "open" | "resolved";

export default function Demo() {
  const [selected, setSelected] = useState(0);
  const [caseState, setCaseState] = useState<CaseState>("preview");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState("");
  const [message, setMessage] = useState("");
  const example = examples[selected];

  function reset(index = selected) {
    setSelected(index);
    setCaseState("preview");
    setEntries([]);
    setNote("");
    setOutcome("");
    setMessage("");
  }

  function openCase() {
    setCaseState("open");
    setEntries([{ kind: "Observation", text: example.observation }]);
    setMessage("Sample case opened. Add a note for the next shift.");
  }

  function addNote(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim()) {
      setMessage("Enter a note before adding it to the record.");
      return;
    }
    setEntries([...entries, { kind: "Technician note", text: note.trim() }]);
    setNote("");
    setMessage("Note added to this sample record.");
  }

  function resolve(event: React.FormEvent) {
    event.preventDefault();
    if (!outcome.trim()) {
      setMessage(
        "Describe the reported outcome before resolving the sample case.",
      );
      return;
    }
    setEntries([
      ...entries,
      { kind: "Reported outcome", text: outcome.trim() },
    ]);
    setOutcome("");
    setCaseState("resolved");
    setMessage(
      "Sample case resolved by a technician report. The original observation is unchanged.",
    );
  }

  function download() {
    const text = [
      "MARCEL / SYNTHETIC SERVICE HANDOFF",
      "Fictional example only. Not machine guidance.",
      "",
      `Machine: ${example.machine}`,
      `Case: ${example.title}`,
      `Case status: ${caseState}`,
      `Controller: ${example.identity}`,
      "",
      "SERVICE RECORD",
      ...entries.map(
        (entry, index) => `${index + 1}. ${entry.kind}: ${entry.text}`,
      ),
      "",
      example.document
        ? "Example reference: fictional training worksheet, Revision A, sample page 2. Not a vendor manual."
        : "Manual guidance withheld: machine identity and applicable documentation unconfirmed.",
      "",
      "Observations and technician reports are distinct. No machine commands were sent.",
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `marcel-sample-${example.id}-handoff.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Sample handoff prepared for download.");
  }

  return (
    <section id="demo" className="border-y border-line bg-panel/40">
      <div className="mx-auto max-w-frame px-5 py-20 md:px-8 md:py-28">
        <SectionHeader
          index="02"
          label="Explore Marcel"
          title={
            <>
              The next shift should not
              <br />
              <span className="text-amber">have to start over.</span>
            </>
          }
          lead="Explore a sample observation, open a service case and leave a useful handoff. Try a lost view or an unfamiliar controller, too."
        />
        <div className="mt-10 flex items-start gap-3 border-l-2 border-amber bg-amber/5 px-4 py-3 text-sm leading-relaxed text-text-dim">
          <span className="shrink-0 font-mono text-xs font-bold leading-6 text-amber">
            DEMO
          </span>
          <span>
            Fictional machines, alarms and documents. This browser example
            illustrates the workflow; it does not diagnose or connect to
            equipment. Changes reset on reload.
          </span>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="self-start rounded-[6px] border border-line bg-ink/70 p-5">
            <p className="tag">Choose a situation</p>
            <div className="mt-4 flex flex-col gap-2">
              {examples.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={selected === index}
                  onClick={() => reset(index)}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-[4px] border px-4 py-3 text-left text-sm transition-colors ${selected === index ? "border-amber bg-amber/5 text-amber" : "border-line text-text-dim hover:border-line-bright hover:text-text"}`}
                >
                  <span>{item.label}</span>
                  <span aria-hidden>↗</span>
                </button>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-text-dim">
              Selecting a situation starts a fresh sample.
            </p>
            <div className="mt-6 hidden border-t border-line pt-5 lg:block">
              <p className="font-mono text-xs text-amber">
                WHAT STAYS WITH THE CASE
              </p>
              <ul className="mt-3 space-y-2 text-sm text-text-dim">
                <li>What was observed</li>
                <li>Which sources apply</li>
                <li>What someone checked</li>
                <li>What happened next</li>
              </ul>
            </div>
          </aside>
          <div className="min-w-0 overflow-hidden rounded-[6px] border border-line-bright bg-ink/80">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-5 py-4">
              <span className="font-mono text-xs font-bold tracking-widest">
                MARCEL / SAMPLE CASE
              </span>
              <span
                data-testid="case-status"
                className="font-mono text-xs text-amber"
              >
                {caseState === "preview"
                  ? "OBSERVATION ONLY"
                  : caseState === "open"
                    ? "CASE OPEN"
                    : "CASE RESOLVED"}
              </span>
            </div>
            <div className="p-5 md:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-sm text-amber">
                  {example.machine}
                </p>
                <button
                  type="button"
                  onClick={() => reset()}
                  className="py-2 text-sm text-text-dim underline decoration-line-bright underline-offset-4 hover:text-text"
                >
                  Reset example
                </button>
              </div>
              <h3 className="mt-2 text-2xl leading-tight md:text-3xl">
                {example.title}
              </h3>
              <p className="mt-3 text-sm text-text-dim">{example.identity}</p>
              <div className="mt-6 border border-line bg-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="pendant text-2xl">{example.signal}</p>
                  <span className="font-mono text-xs text-text-dim">
                    {example.state}
                  </span>
                </div>
                <p className="mt-4 text-base leading-relaxed text-text-dim">
                  {example.observation}
                </p>
              </div>
              {example.document ? (
                <details className="mt-4 border-b border-line pb-4">
                  <summary className="cursor-pointer py-2 text-sm text-amber">
                    View sample source reference
                  </summary>
                  <div className="mt-3 border-l border-line-bright pl-4 text-sm leading-relaxed text-text-dim">
                    <p className="text-text">
                      Fictional training worksheet · Revision A · Sample page 2
                    </p>
                    <p className="mt-2">
                      Record the visible message and the time it was observed.
                      Record technician checks separately from the screen
                      observation.
                    </p>
                    <p className="mt-2">
                      Original demonstration text. This is not a vendor manual
                      or repair procedure.
                    </p>
                  </div>
                </details>
              ) : (
                <div className="mt-4 border-l-2 border-amber pl-4 text-sm leading-relaxed">
                  <p className="text-amber">Manual guidance withheld</p>
                  <p className="mt-1 text-text-dim">
                    Confirm the controller and applicable documents first. The
                    observation can still become a case.
                  </p>
                </div>
              )}
              {caseState === "preview" ? (
                <button
                  type="button"
                  onClick={openCase}
                  className="button-primary mt-7"
                >
                  Open sample case <span aria-hidden>→</span>
                </button>
              ) : (
                <>
                  <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="font-semibold">Service record</h4>
                    <button
                      type="button"
                      onClick={download}
                      className="button-secondary"
                    >
                      Download handoff ↓
                    </button>
                  </div>
                  <ol className="mt-5 space-y-5 border-l border-line-bright pl-5">
                    {entries.map((entry, index) => (
                      <li key={index}>
                        <p className="font-mono text-xs text-amber">
                          {String(index + 1).padStart(2, "0")} / {entry.kind}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-base leading-relaxed text-text-dim">
                          {entry.text}
                        </p>
                      </li>
                    ))}
                  </ol>
                  {caseState === "open" ? (
                    <div className="mt-7 space-y-7 border-t border-line pt-6">
                      <form onSubmit={addNote}>
                        <label
                          htmlFor="sample-note"
                          className="text-sm font-semibold"
                        >
                          Technician note
                        </label>
                        <textarea
                          id="sample-note"
                          rows={3}
                          maxLength={1000}
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="Try a sample note: asked the next shift to review the alarm history."
                          className="mt-2 block w-full resize-y rounded-[4px] border border-line-bright bg-panel p-3 text-base text-text placeholder:text-text-dim"
                        />
                        <button
                          type="submit"
                          disabled={!note.trim()}
                          className="button-secondary mt-3 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Add note
                        </button>
                      </form>
                      <form onSubmit={resolve}>
                        <label
                          htmlFor="sample-outcome"
                          className="text-sm font-semibold"
                        >
                          Reported outcome
                        </label>
                        <p
                          id="outcome-help"
                          className="mt-1 text-sm text-text-dim"
                        >
                          A technician report is required to resolve this sample
                          case.
                        </p>
                        <textarea
                          id="sample-outcome"
                          aria-describedby="outcome-help"
                          rows={2}
                          maxLength={1000}
                          value={outcome}
                          onChange={(event) => setOutcome(event.target.value)}
                          placeholder="Describe the result in this fictional example."
                          className="mt-2 block w-full resize-y rounded-[4px] border border-line-bright bg-panel p-3 text-base text-text placeholder:text-text-dim"
                        />
                        <button
                          type="submit"
                          disabled={!outcome.trim()}
                          className="button-secondary mt-3 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Resolve sample case
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="mt-6 border-t border-line pt-5">
                      <p className="text-sm text-text-dim">
                        The reported outcome is part of the record. It does not
                        change what the original screen showed.
                      </p>
                      <button
                        type="button"
                        className="button-secondary mt-4"
                        onClick={() => {
                          setCaseState("open");
                          setEntries([
                            ...entries,
                            {
                              kind: "Reopened",
                              text: "The sample technician requested another review.",
                            },
                          ]);
                          setMessage(
                            "Sample case reopened for further review.",
                          );
                        }}
                      >
                        Reopen sample case
                      </button>
                    </div>
                  )}
                </>
              )}
              <p
                role="status"
                aria-live="polite"
                className="mt-5 min-h-5 text-sm text-amber"
              >
                {message}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
