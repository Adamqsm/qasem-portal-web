/**
 * Log redaction helpers, ported from Cue-web and shared by every route that
 * logs a submission.
 *
 * Vercel function logs are retained and readable by everyone with access to
 * the project, so logging a raw payload would be a standing plaintext copy of
 * every submitter's name, email and free-text message. These helpers keep a
 * log line useful for debugging and de-duplication without making it a PII
 * store.
 */

/** `adam@example.com` -> `a***@example.com`. */
export function maskEmail(value: string): string {
  const at = value.lastIndexOf("@");
  if (at < 1) return "***";
  return `${value.slice(0, 1)}***${value.slice(at)}`;
}
