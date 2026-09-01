"use client";

import { useEffect, useState } from "react";

/**
 * Light/dark toggle. Reads the class set by the no-flash script in the
 * layout, persists the choice to localStorage, and swaps at runtime.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Re-assert the correct theme on mount: the inline script sets the class
    // pre-paint, but hydration can occasionally reconcile <html> and drop it.
    let isDark: boolean;
    try {
      const stored = localStorage.getItem("qp-theme");
      isDark = stored
        ? stored === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      isDark = document.documentElement.classList.contains("dark");
    }
    document.documentElement.classList.toggle("dark", isDark);
    setDark(isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("qp-theme", next ? "dark" : "light");
    } catch {}
  }

  const isDark = mounted && dark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center border border-transparent text-ink transition-colors duration-200 hover:border-ink ${className}`}
    >
      {/* Sun */}
      <svg
        viewBox="0 0 24 24"
        className={`h-[18px] w-[18px] ${isDark ? "hidden" : "block"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
      </svg>
      {/* Moon */}
      <svg
        viewBox="0 0 24 24"
        className={`h-[18px] w-[18px] ${isDark ? "block" : "hidden"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
