"use client";

import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section id="demo" className="py-24 md:py-32 bg-surface relative overflow-hidden">
      {/* Circuit board pattern */}
      <div className="absolute inset-0 circuit-pattern opacity-30" />

      {/* Animated grid glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-bold"
        >
          Your next alarm doesn&apos;t have to cost you hours.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto"
        >
          Marcel is already trained on your machines. Book a demo and see it
          diagnose a real alarm from your floor.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex flex-wrap justify-center items-center gap-4"
        >
          <a
            href="#demo"
            className="inline-flex items-center px-8 py-3.5 bg-accent text-bg font-semibold text-sm rounded hover:bg-accent/90 transition-all duration-200"
          >
            Request a Demo
          </a>
          <a
            href="#product"
            className="inline-flex items-center px-8 py-3.5 border border-border text-text-secondary font-medium text-sm rounded hover:border-text-secondary hover:text-text-primary transition-all duration-200"
          >
            See the Dashboard
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 text-sm text-text-secondary"
        >
          No setup required for the demo. Bring a real alarm code.
        </motion.p>
      </div>
    </section>
  );
}
