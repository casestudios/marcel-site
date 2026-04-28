"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const machines = [
  {
    image:
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&q=80",
    type: "CNC Lathe",
    support: "Marcel supports FANUC Series 0i turning systems",
  },
  {
    image:
      "https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=600&q=80",
    type: "Robodrill Cell",
    support: "Marcel supports FANUC Robodrill alpha series",
  },
  {
    image:
      "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80",
    type: "Vertical Machining Center",
    support: "Marcel supports VMC with FANUC controls",
  },
];

export default function Industries() {
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
          Built for the Shop Floor
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {machines.map((machine, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="group"
            >
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-bg border border-border">
                <Image
                  src={machine.image}
                  alt={machine.type}
                  fill
                  className="object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent" />
              </div>
              <h3 className="mt-4 font-bold text-lg">{machine.type}</h3>
              <p className="text-sm text-text-secondary mt-1">
                {machine.support}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
