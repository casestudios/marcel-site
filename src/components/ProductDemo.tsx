"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const panels = [
  {
    title: "Fleet Monitor",
    description:
      "Every machine. Every status. One screen. Know what's down before your phone rings.",
    mockup: "fleet",
  },
  {
    title: "Alarm Diagnostic",
    description:
      "Enter a code. Get the cause, the fix, the manual citation. In seconds.",
    mockup: "diagnostic",
  },
  {
    title: "Instant Alerts",
    description:
      "Marcel pings your team the moment something changes. No polling. No lag.",
    mockup: "alerts",
  },
];

function FleetMockup() {
  const machines = [
    { name: "ROBODRILL-01", status: "ALARM", code: "PS0090", color: "alarm" },
    { name: "LATHE-01", status: "RUNNING", code: "—", color: "green-500" },
    { name: "V-MILL-03", status: "IDLE", code: "—", color: "accent" },
    { name: "ROBODRILL-02", status: "RUNNING", code: "—", color: "green-500" },
    { name: "LATHE-02", status: "ALARM", code: "SV0401", color: "alarm" },
    { name: "V-MILL-01", status: "RUNNING", code: "—", color: "green-500" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Fleet Monitor</h3>
        <span className="text-xs font-mono text-text-secondary">
          6 machines · 2 alarms
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {machines.map((m) => (
          <div
            key={m.name}
            className={`bg-bg border rounded-lg p-3 ${
              m.status === "ALARM"
                ? "border-alarm/50 shadow-lg shadow-alarm/10"
                : "border-border"
            }`}
          >
            <p className="text-xs font-mono text-text-secondary">{m.name}</p>
            <p
              className={`text-sm font-bold mt-1 ${
                m.status === "ALARM"
                  ? "text-alarm"
                  : m.status === "RUNNING"
                  ? "text-green-500"
                  : "text-accent"
              }`}
            >
              {m.status}
            </p>
            {m.code !== "—" && (
              <p className="text-xs font-mono text-text-secondary mt-1">
                {m.code}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagnosticMockup() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Alarm Diagnostic</h3>
      </div>
      <div className="bg-bg border border-border rounded-lg p-3 mb-4 flex items-center gap-3">
        <span className="text-text-secondary text-sm">Alarm Code:</span>
        <span className="font-mono font-bold text-alarm">PS0090</span>
        <div className="ml-auto px-3 py-1 bg-accent text-bg text-xs font-bold rounded">
          DIAGNOSE
        </div>
      </div>
      <div className="space-y-3">
        <div className="bg-bg border border-border rounded-lg p-4">
          <p className="text-xs font-mono text-accent mb-2">ROOT CAUSE</p>
          <p className="text-sm text-text-primary">
            Reference position return abnormal — axis did not reach the grid
            point within the specified time.
          </p>
        </div>
        <div className="bg-bg border border-border rounded-lg p-4">
          <p className="text-xs font-mono text-accent mb-2">
            PARAMETERS TO CHECK
          </p>
          <p className="text-sm text-text-primary font-mono">
            PRM 1815, PRM 1816, PRM 1850
          </p>
        </div>
        <div className="bg-bg border border-border rounded-lg p-4">
          <p className="text-xs font-mono text-accent mb-2">MANUAL CITATION</p>
          <p className="text-sm text-text-secondary">
            FANUC Series 0i-MODEL F Maintenance Manual, p. 247
          </p>
        </div>
      </div>
    </div>
  );
}

function AlertsMockup() {
  const alerts = [
    {
      time: "14:32",
      machine: "ROBODRILL-01",
      msg: "Alarm PS0090 fired — reference position return abnormal",
      severity: "critical",
    },
    {
      time: "14:32",
      machine: "ROBODRILL-01",
      msg: "Marcel diagnosed: check PRM 1815, PRM 1816",
      severity: "info",
    },
    {
      time: "13:15",
      machine: "LATHE-02",
      msg: "Alarm SV0401 fired — servo: n-th axis SV ready off",
      severity: "critical",
    },
    {
      time: "13:15",
      machine: "LATHE-02",
      msg: "Marcel diagnosed: check servo amplifier connection",
      severity: "info",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Instant Alerts</h3>
        <span className="text-xs font-mono text-text-secondary">
          via Telegram
        </span>
      </div>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div
            key={i}
            className={`bg-bg border rounded-lg p-3 flex gap-3 ${
              a.severity === "critical"
                ? "border-alarm/30"
                : "border-border"
            }`}
          >
            <span className="text-xs font-mono text-text-secondary whitespace-nowrap mt-0.5">
              {a.time}
            </span>
            <div>
              <p className="text-xs font-mono text-accent">{a.machine}</p>
              <p className="text-sm text-text-primary mt-0.5">{a.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section id="product" className="bg-bg" ref={containerRef}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-bold text-center pt-24 pb-16"
        >
          See Marcel Work
        </motion.h2>
      </div>

      {/* Sticky scroll container */}
      <div className="relative" style={{ height: "300vh" }}>
        <div className="sticky top-0 h-screen flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: text panels */}
            <div className="space-y-8">
              {panels.map((panel, i) => (
                <PanelText
                  key={i}
                  index={i}
                  title={panel.title}
                  description={panel.description}
                  scrollProgress={scrollYProgress}
                />
              ))}
            </div>

            {/* Right: mockup */}
            <div className="relative h-[500px] md:h-[600px]">
              {panels.map((panel, i) => (
                <MockupWrapper
                  key={i}
                  index={i}
                  type={panel.mockup}
                  scrollProgress={scrollYProgress}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PanelText({
  index,
  title,
  description,
  scrollProgress,
}: {
  index: number;
  title: string;
  description: string;
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const opacity = useTransform(
    scrollProgress,
    index === 0
      ? [0, 0.1, 0.28, 0.33]
      : index === 1
      ? [0.28, 0.38, 0.61, 0.66]
      : [0.61, 0.71, 0.95, 1],
    index === 0
      ? [0.3, 1, 1, 0.3]
      : index === 1
      ? [0.3, 1, 1, 0.3]
      : [0.3, 1, 1, 1]
  );

  const indicatorWidth = useTransform(
    scrollProgress,
    index === 0
      ? [0, 0.33]
      : index === 1
      ? [0.33, 0.66]
      : [0.66, 1],
    [0, 100]
  );

  return (
    <motion.div style={{ opacity }} className="flex gap-4">
      {/* Yellow progress indicator */}
      <div className="flex-shrink-0 w-1 rounded-full bg-border overflow-hidden relative">
        <motion.div
          className="absolute top-0 left-0 w-full bg-accent rounded-full"
          style={{ height: useTransform(indicatorWidth, (v) => `${v}%`) }}
        />
      </div>
      <div>
        <span className="font-mono text-accent text-sm">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="text-xl md:text-2xl font-bold mt-1">{title}</h3>
        <p className="text-text-secondary mt-2">{description}</p>
      </div>
    </motion.div>
  );
}

function MockupWrapper({
  index,
  type,
  scrollProgress,
}: {
  index: number;
  type: string;
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const opacity = useTransform(
    scrollProgress,
    index === 0
      ? [0, 0.05, 0.28, 0.33]
      : index === 1
      ? [0.28, 0.33, 0.61, 0.66]
      : [0.61, 0.66, 1, 1],
    index === 0
      ? [1, 1, 1, 0]
      : index === 1
      ? [0, 1, 1, 0]
      : [0, 1, 1, 1]
  );

  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      <div className="relative w-full h-full bg-surface border border-border rounded-xl overflow-hidden shadow-2xl shadow-black/40">
        {/* Browser chrome */}
        <div className="h-10 bg-bg border-b border-border flex items-center px-4 gap-2">
          <div className="w-3 h-3 rounded-full bg-alarm/60" />
          <div className="w-3 h-3 rounded-full bg-accent/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <div className="ml-4 flex-1 h-6 bg-surface rounded text-xs text-text-secondary flex items-center px-3 font-mono">
            app.marcelai.com
          </div>
        </div>
        <div className="p-4 md:p-6 h-[calc(100%-2.5rem)] overflow-y-auto">
          {type === "fleet" && <FleetMockup />}
          {type === "diagnostic" && <DiagnosticMockup />}
          {type === "alerts" && <AlertsMockup />}
        </div>
        <div className="absolute inset-0 scanline-overlay pointer-events-none" />
        <div className="absolute -inset-1 bg-accent/5 rounded-xl blur-xl -z-10" />
      </div>
    </motion.div>
  );
}
