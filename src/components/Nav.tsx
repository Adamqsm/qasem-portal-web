"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NAV_ITEMS } from "@/lib/site";
import { Monogram, Wordmark } from "@/components/BrandWordmark";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Sticky header. Steady by design: constant paper ground and a hairline —
 * no scroll transformations. Wordmark on desktop (>= its 120px brand
 * minimum), monogram on small screens (>= its 32px minimum).
 */
export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Close the panel on route change; it should never survive a navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes; focus moves into the panel when it opens.
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>("a");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // Lock body scroll while the panel covers the page.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <div className="container-site flex h-[4.5rem] items-center justify-between sm:h-20">
        <Link
          href="/"
          className="inline-flex items-center"
          aria-label="Qasem Portal home"
        >
          <span className="hidden sm:block">
            <Wordmark heightPx={48} />
          </span>
          <span className="sm:hidden">
            <Monogram sizePx={40} decorative />
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden items-center gap-8 sm:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`font-sans text-[0.8125rem] font-semibold uppercase tracking-label text-ink underline-offset-[6px] transition-colors hover:underline ${
                isActive(item.href) ? "underline decoration-2" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>

        {/* Small-screen controls */}
        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center border border-transparent text-ink transition-colors hover:border-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="square"
              aria-hidden="true"
            >
              {open ? (
                <path d="M5 5l14 14M19 5L5 19" />
              ) : (
                <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Small-screen panel */}
      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[4.5rem] z-40 overflow-y-auto border-t border-line bg-paper sm:hidden"
      >
        <nav aria-label="Primary" className="container-site flex flex-col py-8">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className="border-b border-line py-5 font-serif text-3xl text-ink"
          >
            Home
          </Link>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="border-b border-line py-5 font-serif text-3xl text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
