import { sanitizeUtm, type UtmParams } from "@/lib/utm";

/**
 * Server-side validation for /api/contact — the authoritative gate. The
 * client's HTML constraints are hints only; everything here re-checks the
 * raw payload, caps every field at the edge before any further processing,
 * and never trusts a client-submitted value beyond the message content
 * itself.
 */

export const SUBMISSION_KINDS = ["general", "careers"] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];

export type SubmissionData = {
  kind: SubmissionKind;
  name: string;
  email: string;
  message: string;
  /** Careers only; empty string means "not provided". */
  link?: string;
  utm: UtmParams | null;
};

export type ValidationResult =
  | { ok: true; data: SubmissionData }
  | { ok: false; field: string };

export const LIMITS = {
  name: { min: 2, max: 120 },
  email: { max: 254 }, // RFC 5321 max address length
  message: { min: 10, max: 5000 },
  link: { max: 300 },
} as const;

/** Deliberately simple shape check — the mailbox proves itself on reply. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSubmission(body: unknown): ValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, field: "body" };
  }
  const raw = body as Record<string, unknown>;

  if (
    typeof raw.kind !== "string" ||
    !(SUBMISSION_KINDS as readonly string[]).includes(raw.kind)
  ) {
    return { ok: false, field: "kind" };
  }
  const kind = raw.kind as SubmissionKind;

  if (typeof raw.name !== "string") return { ok: false, field: "name" };
  const name = raw.name.trim();
  if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) {
    return { ok: false, field: "name" };
  }

  // Cap on the raw value, at the edge, before normalisation (Cue lesson:
  // an unbounded string must never reach lower-casing/regex work).
  if (typeof raw.email !== "string" || raw.email.length > LIMITS.email.max) {
    return { ok: false, field: "email" };
  }
  const email = raw.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, field: "email" };

  if (typeof raw.message !== "string" || raw.message.length > LIMITS.message.max) {
    return { ok: false, field: "message" };
  }
  const message = raw.message.trim();
  if (message.length < LIMITS.message.min || message.length > LIMITS.message.max) {
    return { ok: false, field: "message" };
  }

  let link: string | undefined;
  if (kind === "careers") {
    if (raw.link !== undefined && typeof raw.link !== "string") {
      return { ok: false, field: "link" };
    }
    const trimmed = typeof raw.link === "string" ? raw.link.trim() : "";
    if (trimmed) {
      if (trimmed.length > LIMITS.link.max) return { ok: false, field: "link" };
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        return { ok: false, field: "link" };
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { ok: false, field: "link" };
      }
      link = trimmed;
    }
  }

  return {
    ok: true,
    data: {
      kind,
      name,
      email,
      message,
      ...(link !== undefined ? { link } : {}),
      // Attribution is best-effort: whitelisted and clamped, never a reason
      // to reject a submission.
      utm: sanitizeUtm(raw.utm),
    },
  };
}
