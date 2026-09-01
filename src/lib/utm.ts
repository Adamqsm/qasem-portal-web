/**
 * UTM attribution, first-party only, ported from Cue-web.
 *
 * The site has no analytics; attribution rides on the records a visitor
 * chooses to submit through the contact and careers forms, so it is possible
 * to know later which channel a real inquiry came from. Two halves:
 *
 * - Pure helpers (sanitizeUtm, utmFromSearch, withUtm) — importable anywhere,
 *   including API routes. No browser APIs touched at module scope.
 * - Client capture (captureUtm, getUtmParams) — first-touch wins: the params
 *   on the LANDING url are held in module memory for the whole SPA session
 *   and mirrored to sessionStorage, so an internal CTA's own utm_* never
 *   overwrites the campaign that actually brought the visitor.
 *
 * Storage note: sessionStorage only, first-touch only, attached only to a
 * submission the visitor sends. Disclosed in the privacy policy.
 */

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

/** Values are attribution labels, not prose — clamp hard and strip controls. */
const MAX_VALUE_LEN = 200;

const STORAGE_KEY = "qp-utm";

function cleanValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const trimmed = value.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_VALUE_LEN);
}

/**
 * Whitelist + clamp an untrusted utm object (client payload field, parsed
 * query, storage). Never throws, never rejects a submission — attribution is
 * best-effort by design. Returns null when nothing usable remains.
 */
export function sanitizeUtm(input: unknown): UtmParams | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = cleanValue(source[key]);
    if (value) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Parse utm_* out of a location.search string ("?utm_source=x&..."). */
export function utmFromSearch(search: string): UtmParams | null {
  if (!search) return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  const raw: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value !== null) raw[key] = value;
  }
  return sanitizeUtm(raw);
}

/**
 * Tag an internal funnel link with its placement, so navigations into
 * /contact attribute the CTA that sent them. External campaign params always
 * win over these — see the first-touch rule in captureUtm.
 */
export function withUtm(href: string, content: string): string {
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}utm_source=qasem-site&utm_medium=internal&utm_content=${encodeURIComponent(content)}`;
}

// ---- Client capture (no-ops on the server) --------------------------------

let captured: UtmParams | null = null;

/**
 * Record the first utm_* params this session saw. Safe to call on every
 * navigation; later calls never overwrite.
 */
export function captureUtm(): void {
  if (typeof window === "undefined") return;
  if (captured) return;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      captured = sanitizeUtm(JSON.parse(stored));
      if (captured) return;
    }
  } catch {
    // Fall through to the URL.
  }
  captured = utmFromSearch(window.location.search);
  if (captured) {
    try {
      if (!sessionStorage.getItem(STORAGE_KEY)) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
      }
    } catch {
      // Storage unavailable — memory capture still covers this pageview.
    }
  }
}

/** The params submissions should attach; null when the session has none. */
export function getUtmParams(): UtmParams | null {
  captureUtm();
  return captured;
}
