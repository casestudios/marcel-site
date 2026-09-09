"use client";

import { useState } from "react";

const links = [
  { href: "#products", label: "For your shop" },
  { href: "#demo", label: "Explore Marcel" },
  { href: "#coverage", label: "Machine coverage" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ink/95 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-amber focus:p-3 focus:text-ink"
      >
        Skip to content
      </a>
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-frame items-center justify-between gap-3 px-5 md:px-8"
      >
        <a
          href="#top"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5"
          aria-label="Marcel home"
        >
          <span className="grid h-7 w-7 place-items-center rounded-[4px] bg-amber text-base font-black text-ink">
            M
          </span>
          <span className="font-mono text-sm font-bold tracking-widest">
            MARCEL
            <span className="ml-2 hidden font-normal text-text-dim sm:inline">
              / CNC
            </span>
          </span>
        </a>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-text-dim transition-colors hover:text-amber"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="hidden rounded-[4px] border border-amber/60 px-4 py-2 font-mono text-sm text-amber hover:bg-amber hover:text-ink sm:inline-flex"
          >
            Talk to us ↗
          </a>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
            className="button-secondary md:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </nav>
      {open && (
        <div
          id="mobile-navigation"
          className="border-t border-line bg-ink px-5 py-4 md:hidden"
        >
          {[...links, { href: "#contact", label: "Talk to us" }].map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-base text-text-dim hover:text-amber"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
