import { maskEmail } from "@/lib/log-redact";
import type { SubmissionData } from "@/lib/validation";

/**
 * Notification email on each stored submission, via Resend's REST API
 * (plain fetch — no SDK dependency to drift).
 *
 * Deliverability rules learned on Cue, applied here from day one:
 * - text-only body: no HTML means no tracking pixels and nothing for a spam
 *   filter to dislike (open/click tracking must ALSO stay off on the Resend
 *   domain config — see docs/DEPLOY.md),
 * - plain transactional subject, no offer/trigger vocabulary,
 * - from address on the verified qasem-portal.com domain, reply-to set to
 *   the submitter so a reply goes straight back to them.
 *
 * Email is a courtesy copy: Firestore is the source of truth. A missing key
 * or a failed send never fails the submission; the outcome is logged
 * (redacted) instead.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const DEFAULT_INBOX = "adam@qasem-portal.com";
const DEFAULT_FROM = "Qasem Portal <notifications@qasem-portal.com>";

export type EmailOutcome = "sent" | "skipped" | "failed";

export async function sendSubmissionEmail(
  data: SubmissionData
): Promise<EmailOutcome> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return "skipped";

  const to = process.env.CONTACT_INBOX || DEFAULT_INBOX;
  const from = process.env.MAIL_FROM || DEFAULT_FROM;

  const isCareers = data.kind === "careers";
  const subject = isCareers
    ? "New careers introduction via qasem-portal.com"
    : "New general inquiry via qasem-portal.com";

  const lines = [
    isCareers
      ? "A careers introduction was submitted on qasem-portal.com."
      : "A general inquiry was submitted on qasem-portal.com.",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    ...(isCareers && data.link ? [`Link: ${data.link}`] : []),
    "",
    "Message:",
    data.message,
    "",
    ...(data.utm
      ? [
          "Attribution: " +
            Object.entries(data.utm)
              .map(([k, v]) => `${k}=${v}`)
              .join(" "),
          "",
        ]
      : []),
    "The full record is stored in Firestore. Reply to this email to answer the sender directly.",
  ];

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: data.email,
        subject,
        text: lines.join("\n"),
      }),
    });
    if (!res.ok) {
      console.error(
        `[contact] notification email failed (${res.status}) for ${maskEmail(data.email)}`
      );
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error(
      `[contact] notification email errored for ${maskEmail(data.email)}:`,
      err instanceof Error ? err.message : "unknown"
    );
    return "failed";
  }
}
