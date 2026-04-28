"use client";

export default function Footer() {
  return (
    <footer className="bg-footer-bg border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Left: logo + tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
              <span className="text-bg font-bold text-lg leading-none">M</span>
            </div>
            <div>
              <span className="text-text-primary font-bold tracking-widest uppercase text-sm">
                Marcel
              </span>
              <p className="text-xs text-text-secondary">
                AI diagnostics for the modern machine shop.
              </p>
            </div>
          </div>

          {/* Center: links */}
          <div className="flex items-center gap-6">
            <a
              href="#product"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Product
            </a>
            <a
              href="#demo"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Demo
            </a>
            <a
              href="mailto:hello@marcelai.com"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Contact
            </a>
          </div>

          {/* Right: email + social */}
          <div className="flex items-center gap-4">
            <a
              href="mailto:hello@marcelai.com"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              hello@marcelai.com
            </a>
            <a
              href="#"
              className="text-text-secondary hover:text-text-primary transition-colors"
              aria-label="LinkedIn"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-text-secondary text-center">
            &copy; 2025 Marcel. Built for FANUC shops.
          </p>
        </div>
      </div>
    </footer>
  );
}
