"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Alarm Fires",
    description:
      "FANUC machine throws a code. Marcel detects it instantly via your connection or manual entry.",
  },
  {
    number: "02",
    title: "Marcel Diagnoses",
    description:
      "Hybrid RAG search across 3,600+ pages returns the exact cause, parameters to check, and countermeasures.",
  },
  {
    number: "03",
    title: "Team Responds",
    description:
      "Your tech has a cited, prioritized action plan. No guessing. No waiting for the OEM.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-bold text-center mb-20"
        >
          From Alarm to Answer in Seconds
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-accent/50 via-accent to-accent/50 origin-left"
            />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
              className="text-center relative"
            >
              <span className="inline-block font-mono text-4xl font-bold text-accent mb-4">
                {step.number}
              </span>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-text-secondary leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
