"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureUtm } from "@/lib/utm";

/** Invisible: records first-touch utm_* params on landing and navigation. */
export default function UtmCapture() {
  const pathname = usePathname();
  useEffect(() => {
    captureUtm();
  }, [pathname]);
  return null;
}
