"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import CountUp from "./CountUp";

const metrics = [
  { value: 3600, suffix: "+", label: "Manual pages ingested" },
  { value: 2, prefix: "<", suffix: " min", label: "Avg diagnosis time" },
  { value: 0, prefix: "$", suffix: "", label: "Guesswork required" },
  { value: 100, suffix: "%", label: "Cited answers" },
];

export default function Metrics() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 bg-bg border-y border-border" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {metrics.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="font-mono text-4xl md:text-5xl font-bold text-accent">
                {isInView ? (
                  <>
                    {metric.prefix}
                    <CountUp end={metric.value} />
                    {metric.suffix}
                  </>
                ) : (
                  <span>
                    {metric.prefix}0{metric.suffix}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
