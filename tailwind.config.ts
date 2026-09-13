import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0B0D", // near-black graphite base
        panel: "#101318", // raised surface
        "panel-2": "#14181F", // deeper inset
        line: "#232833", // hairline / blueprint grid
        "line-bright": "#333B49",
        amber: "#F5C518", // THE signal accent (FANUC control yellow)
        "amber-dim": "#8A730F",
        alarm: "#FF4438", // functional controller ALM state only, used sparingly
        text: "#E8EAED",
        "text-dim": "#8A919E",
        "text-faint": "#565D6A",
      },
      fontFamily: {
        display: ["var(--font-display)", "Archivo", "system-ui", "sans-serif"],
        sans: ["var(--font-display)", "Archivo", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Space Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.045em",
        widest: "0.28em",
      },
      maxWidth: {
        frame: "1200px",
      },
      keyframes: {
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "alm-pulse": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 10px 1px rgba(255,68,56,0.7)" },
          "50%": { opacity: "0.35", boxShadow: "0 0 2px 0 rgba(255,68,56,0.3)" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "rise": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1.05s step-end infinite",
        "alm-pulse": "alm-pulse 1.1s ease-in-out infinite",
        scan: "scan 3.2s linear infinite",
        rise: "rise 0.5s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
