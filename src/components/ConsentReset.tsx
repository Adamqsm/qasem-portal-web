"use client";

import { resetConsent } from "@/lib/consent";

/** Lets a visitor change their analytics choice later (privacy page). */
export default function ConsentReset() {
  return (
    <button type="button" className="btn btn-ghost px-6" onClick={resetConsent}>
      <span>Change your choice</span>
      <span aria-hidden="true" className="h-4 w-px bg-current opacity-40" />
      <span lang="ar" dir="rtl" className="normal-case tracking-normal">
        تغيير اختيارك
      </span>
    </button>
  );
}
