"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  {
    label: "Alarm Response",
    content: {
      title: "Instant Alarm Diagnosis",
      description:
        "Maintenance tech enters PS0090. Marcel returns root cause (reference position return abnormal), parameters to inspect (PRM1815, PRM1816), and page citation from FANUC maintenance manual. No more digging.",
      stat: "< 2 min avg diagnosis time",
      mockup: "alarm",
    },
  },
  {
    label: "Fleet Monitoring",
    content: {
      title: "Every Machine at a Glance",
      description:
        "Shop floor manager sees all 6 machines on one screen. ROBODRILL-01 is in alarm. LATHE-01 is running. Response time drops from hours to minutes.",
      stat: "6 machines monitored in real-time",
      mockup: "fleet",
    },
  },
  {
    label: "Knowledge Retention",
    content: {
      title: "Institutional Knowledge, Preserved",
      description:
        "Senior tech retires. Marcel still knows what he knew. 3,600 pages of FANUC documentation available to every technician, every shift.",
      stat: "3,600+ pages of knowledge retained",
      mockup: "knowledge",
    },
  },
  {
    label: "Proactive Alerts",
    content: {
      title: "Know Before It Breaks",
      description:
        "Marcel notifies your team via Telegram/Slack before a machine hits critical failure. Condition monitoring, not just reactive response.",
      stat: "Real-time notifications to your team",
      mockup: "proactive",
    },
  },
];

function TabMockup({ type }: { type: string }) {
  if (type === "alarm") {
    return (
      <div className="space-y-3">
        <div className="bg-bg border border-border rounded-lg p-3 flex items-center gap-3">
          <span className="text-text-secondary text-sm">Code:</span>
          <span className="font-mono font-bold text-alarm">PS0090</span>
        </div>
        <div className="bg-bg border border-alarm/30 rounded-lg p-4">
          <p className="text-xs font-mono text-alarm mb-1">DIAGNOSIS</p>
          <p className="text-sm">Reference position return abnormal</p>
          <p className="text-xs text-text-secondary mt-2 font-mono">
            Check: PRM 1815, PRM 1816 &middot; Manual p.247
          </p>
        </div>
      </div>
    );
  }
  if (type === "fleet") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[
          { n: "RD-01", s: "ALARM", c: "text-alarm" },
          { n: "LT-01", s: "RUN", c: "text-green-500" },
          { n: "VM-03", s: "IDLE", c: "text-accent" },
          { n: "RD-02", s: "RUN", c: "text-green-500" },
          { n: "LT-02", s: "RUN", c: "text-green-500" },
          { n: "VM-01", s: "RUN", c: "text-green-500" },
        ].map((m) => (
          <div key={m.n} className="bg-bg border border-border rounded p-2">
            <p className="text-xs font-mono text-text-secondary">{m.n}</p>
            <p className={`text-xs font-bold ${m.c}`}>{m.s}</p>
          </div>
        ))}
      </div>
    );
  }
  if (type === "knowledge") {
    return (
      <div className="space-y-2">
        <div className="bg-bg border border-border rounded-lg p-3">
          <p className="text-xs font-mono text-accent">FANUC SERIES 0i-F</p>
          <p className="text-sm text-text-secondary mt-1">
            Maintenance Manual &middot; 3,647 pages indexed
          </p>
        </div>
        <div className="bg-bg border border-border rounded-lg p-3">
          <p className="text-xs font-mono text-accent">PARAMETER LIST</p>
          <p className="text-sm text-text-secondary mt-1">
            Complete parameter reference &middot; Searchable
          </p>
        </div>
        <div className="bg-bg border border-border rounded-lg p-3">
          <p className="text-xs font-mono text-accent">ALARM CODES</p>
          <p className="text-sm text-text-secondary mt-1">
            All PS, SV, OT, SR series &middot; Cross-referenced
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {[
        {
          t: "14:32",
          m: "ROBODRILL-01 alarm PS0090 — diagnosed automatically",
        },
        { t: "13:15", m: "LATHE-02 spindle temp approaching threshold" },
        { t: "11:48", m: "V-MILL-03 cycle count reached maintenance interval" },
      ].map((a, i) => (
        <div key={i} className="bg-bg border border-border rounded-lg p-3">
          <span className="text-xs font-mono text-text-secondary">{a.t}</span>
          <p className="text-sm mt-1">{a.m}</p>
        </div>
      ))}
    </div>
  );
}

export default function UseCases() {
  const [active, setActive] = useState(0);

  return (
    <section id="use-cases" className="py-24 md:py-32 bg-bg">
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-bold text-center mb-16"
        >
          Built for Every Scenario
        </motion.h2>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`px-5 py-2.5 rounded text-sm font-medium transition-all duration-200 ${
                active === i
                  ? "bg-accent text-bg"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start"
          >
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                {tabs[active].content.title}
              </h3>
              <p className="text-text-secondary leading-relaxed text-lg">
                {tabs[active].content.description}
              </p>
              <p className="mt-6 font-mono text-accent text-sm">
                {tabs[active].content.stat}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <TabMockup type={tabs[active].content.mockup} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
