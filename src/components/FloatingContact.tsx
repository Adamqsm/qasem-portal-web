"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { withUtm } from "@/lib/utm";

/**
 * Floating contact button — a persistent route to /contact for visitors deep
 * in the content. Appears after the fold so it never competes with the hero
 * CTAs, stays off the contact page itself (covering the form it links to
 * would be worse than absent), and steps aside while the footer is on screen.
 *
 * z-40: under the sticky nav (50).
 */
const HIDDEN_ROUTES = /^\/contact/;
const SHOW_AFTER_PX = 400;

export default function FloatingContact() {
  const [pastFold, setPastFold] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setPastFold(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(([entry]) =>
      setFooterInView(entry.isIntersecting)
    );
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  const shown = pastFold && !footerInView;

  if (HIDDEN_ROUTES.test(pathname ?? "")) return null;

  return (
    <div
      className={
        "fixed bottom-5 right-5 z-40 transition-all duration-300 " +
        (shown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0")
      }
    >
      <Link
        href={withUtm("/contact", "floating-contact")}
        className="btn btn-primary px-6"
        tabIndex={shown ? undefined : -1}
        aria-hidden={shown ? undefined : true}
      >
        Contact us
      </Link>
    </div>
  );
}
