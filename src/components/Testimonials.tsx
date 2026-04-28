"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const testimonials = [
  {
    quote:
      "We used to lose half a shift just figuring out what went wrong. Marcel gives us the answer before the operator finishes calling it in.",
    name: "Mike Torres",
    title: "Maintenance Lead",
    company: "Precision Parts Co.",
  },
  {
    quote:
      "Our best FANUC guy retired two years ago. Marcel replaced 30 years of tribal knowledge with something the whole team can access.",
    name: "Sarah Chen",
    title: "Operations Manager",
    company: "Pacific CNC Solutions",
  },
  {
    quote:
      "The ROI was immediate. First week, Marcel diagnosed an alarm that would have taken us 6 hours to figure out. Took 90 seconds.",
    name: "James Kowalski",
    title: "Shop Floor Supervisor",
    company: "Midwest Machining Group",
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 md:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-bold text-center mb-16"
        >
          What Shop Teams Say
        </motion.h2>

        {/* Desktop: all three */}
        <div className="hidden md:grid grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-bg border border-border rounded-lg p-8 relative"
            >
              <div className="absolute left-0 top-8 bottom-8 w-1 bg-accent rounded-r" />
              <p className="text-text-primary leading-relaxed text-lg italic pl-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 pl-4">
                <p className="font-mono text-sm text-accent">{t.name}</p>
                <p className="text-sm text-text-secondary">
                  {t.title}, {t.company}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile: carousel */}
        <div className="md:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-bg border border-border rounded-lg p-8 relative"
            >
              <div className="absolute left-0 top-8 bottom-8 w-1 bg-accent rounded-r" />
              <p className="text-text-primary leading-relaxed text-lg italic pl-4">
                &ldquo;{testimonials[active].quote}&rdquo;
              </p>
              <div className="mt-6 pl-4">
                <p className="font-mono text-sm text-accent">
                  {testimonials[active].name}
                </p>
                <p className="text-sm text-text-secondary">
                  {testimonials[active].title},{" "}
                  {testimonials[active].company}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  active === i ? "bg-accent w-6" : "bg-border"
                }`}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
