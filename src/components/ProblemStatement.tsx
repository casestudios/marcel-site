"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import CountUp from "./CountUp";

const stats = [
  {
    value: 2500,
    prefix: "$",
    suffix: "",
    label: "avg/hr",
    description: "The cost of unplanned CNC downtime",
  },
  {
    value: 4.7,
    prefix: "",
    suffix: " hrs",
    label: "avg",
    description: "Time to diagnose without expert support",
  },
  {
    value: 3600,
    prefix: "",
    suffix: "",
    label: "pages",
    description: "FANUC documentation your team doesn't have time to read",
  },
];

export default function ProblemStatement() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-32 bg-bg" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-bold text-center max-w-4xl mx-auto leading-tight"
        >
          The alarm fires. Your best tech retired last year. The manual is 3,600
          pages.
        </motion.h2>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-surface border border-border rounded-lg p-8 text-center"
            >
              <div className="font-mono text-4xl md:text-5xl font-bold text-accent">
                {isInView ? (
                  <>
                    {stat.prefix}
                    <CountUp
                      end={stat.value}
                      decimals={stat.value % 1 !== 0 ? 1 : 0}
                    />
                    {stat.suffix}
                  </>
                ) : (
                  <span>
                    {stat.prefix}0{stat.suffix}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-text-secondary font-mono">
                {stat.label}
              </p>
              <p className="mt-4 text-text-secondary">{stat.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-2xl md:text-4xl font-bold text-accent text-center"
        >
          Marcel is the expert in the room.
        </motion.p>
      </div>
    </section>
  );
}
