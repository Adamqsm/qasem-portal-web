/** Canonical site origin — the www host; apex 308s to it at the platform. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qasem-portal.com";

export const SITE_NAME = "Qasem Portal";

/** One sentence, reused as the default meta description and JSON-LD text. */
export const SITE_DESCRIPTION =
  "Qasem Portal is a technology company building modern applications for hospitality and adjacent sectors. Registered in Dubai, United Arab Emirates.";

/** Cue's canonical origin and Organization node id (matches Cue-web's graph). */
export const CUE_URL = "https://www.cue-app.net";
export const CUE_ORG_ID = `${CUE_URL}/#organization`;

export const NAV_ITEMS = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/contact", label: "Contact" },
] as const;
