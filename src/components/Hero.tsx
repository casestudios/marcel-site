"use client";

import { motion } from "framer-motion";
import LogoCarousel from "./LogoCarousel";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/70 via-bg/60 to-bg" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-16 flex-1 flex flex-col justify-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight max-w-4xl"
        >
          Downtime Has a Cost.
          <br />
          <span className="text-accent">Marcel Cuts It Short.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="mt-6 text-lg md:text-xl text-text-secondary max-w-2xl"
        >
          AI-powered CNC diagnostics for FANUC machines. When an alarm fires,
          Marcel gives your team the answer — cited, prioritized, and instant.
        </motion.p>

        {/* Stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-8 flex flex-wrap items-center gap-4 md:gap-6 font-mono text-accent text-sm md:text-base"
        >
          <span>$1,000–$5,000/hr</span>
          <span className="text-border">·</span>
          <span>3,600+ manual pages ingested</span>
          <span className="text-border">·</span>
          <span>Instant alarm diagnosis</span>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="mt-10 flex flex-wrap items-center gap-4"
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
            See How It Works
          </a>
        </motion.div>
      </div>

      {/* Logo carousel */}
      <div className="relative z-10 pb-12">
        <LogoCarousel />
      </div>
    </section>
  );
}
