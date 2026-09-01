import type { Config } from "tailwindcss";

/**
 * Qasem Portal design tokens — monochrome by mandate.
 *
 * The palette is the brand ink (#111111), a paper ground, and grayscale
 * between; there is no brand accent. Every color is a CSS variable declared
 * in globals.css (R G B triplets, so Tailwind opacity modifiers still work),
 * with light values on :root and dark values on .dark. The single functional
 * color is the desaturated error red on form validation; success states stay
 * monochrome. Cue's terracotta appears ONLY inside the Cue portfolio card
 * (it is Cue's identity, not Qasem Portal's) — hence `cue` below, which must
 * never leak into Qasem Portal chrome.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        faint: "rgb(var(--c-faint) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        error: "rgb(var(--c-error) / <alpha-value>)",
        cue: "rgb(var(--c-cue) / <alpha-value>)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Times New Roman", "serif"],
        sans: [
          "var(--font-sans)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      letterSpacing: {
        label: "0.14em",
      },
      maxWidth: {
        site: "76rem",
        measure: "42rem",
      },
    },
  },
  plugins: [],
};
export default config;
