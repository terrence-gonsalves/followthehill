/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Follow The Hill brand palette
        hill: {
          ink:    "#1A1C1E",   // Primary text, headings
          slate:  "#4A5568",   // Secondary text, metadata
          paper:  "#F8F7F4",   // Page background (warm off-white)
          rule:   "#E2DDD5",   // Dividers, borders
          red:    "#C0392B",   // Accent — links, CTAs
          blue:   "#1A3A5C",   // Conservative
          orange: "#C0550A",   // NDP
          teal:   "#16A085",   // AI feature accent
          gold:   "#B7950B",   // Bloc Québécois
          green:  "#1A6B3C",   // Green Party
        },
        // Party palette (used for badges)
        party: {
          liberal:      "#C0392B",
          conservative: "#1A3A5C",
          ndp:          "#C0550A",
          bloc:         "#6B4FA0",
          green:        "#1A6B3C",
          independent:  "#4A5568",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "Menlo", "monospace"],
      },
      fontSize: {
        "display-xl": ["3.5rem",  { lineHeight: "1.1",  letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["2.5rem",  { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-md": ["1.875rem",{ lineHeight: "1.2",  letterSpacing: "-0.01em", fontWeight: "600" }],
        "display-sm": ["1.5rem",  { lineHeight: "1.3",  letterSpacing: "-0.01em", fontWeight: "600" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      maxWidth: {
        "content": "1200px",
        "prose":   "72ch",
      },
      borderRadius: {
        "sm": "4px",
        DEFAULT: "6px",
        "md": "8px",
        "lg": "12px",
      },
      boxShadow: {
        "card":  "0 1px 3px rgba(26,28,30,0.08), 0 1px 2px rgba(26,28,30,0.04)",
        "panel": "0 4px 12px rgba(26,28,30,0.08), 0 2px 4px rgba(26,28,30,0.04)",
        "focus": "0 0 0 3px rgba(192,57,43,0.25)",
      },
      backgroundImage: {
        // Subtle warm gradient for hero
        "hill-hero": "linear-gradient(135deg, #F8F7F4 0%, #F0EDE6 100%)",
      },
    },
  },
  plugins: [],
}
