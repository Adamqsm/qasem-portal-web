"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { GA_ID } from "@/lib/analytics";
import { type Consent, readConsent, writeConsent } from "@/lib/consent";
import ConsentBanner from "@/components/ConsentBanner";

/**
 * Switch Google signals and ad personalization off before gtag('config').
 * Rendered ahead of <GoogleAnalytics>: sibling effects run in order, and the
 * library's init script is added in its own effect.
 */
function AdFeaturesOff() {
  useEffect(() => {
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    // gtag.js reads Arguments objects from the dataLayer, not arrays.
    (function (..._args: unknown[]) {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    })("set", { allow_google_signals: false, allow_ad_personalization_signals: false });
  }, []);
  return null;
}

/**
 * Google Analytics, behind consent. Nothing loads until the visitor accepts;
 * `enabled` is false everywhere except the production deployment, where the
 * banner is not shown either.
 */
export default function Analytics({ enabled }: { enabled: boolean }) {
  // undefined until mounted: localStorage is unreadable during the static render.
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  useEffect(() => setConsent(readConsent()), []);

  if (!enabled || consent === undefined || consent === "denied") return null;
  if (consent === "granted") {
    return (
      <>
        <AdFeaturesOff />
        <GoogleAnalytics gaId={GA_ID} />
      </>
    );
  }
  return (
    <ConsentBanner
      onChoose={(choice) => {
        writeConsent(choice);
        setConsent(choice);
      }}
    />
  );
}
