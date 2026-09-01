import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { hashIdentifier } from "@/lib/hash";
import { maskEmail } from "@/lib/log-redact";
import { consumeRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { validateSubmission } from "@/lib/validation";
import { sendSubmissionEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * The single server-side write path for both forms. Order of the gates:
 *
 *   validate -> Turnstile -> Admin SDK -> salted-IP rate limit -> store -> email
 *
 * Turnstile runs before anything that costs Firestore quota. Every
 * infrastructure gap fails CLOSED with a 503 (unconfigured Turnstile secret,
 * missing Admin credentials, missing IP_HASH_SALT): an endpoint that cannot
 * be verified, persisted, or metered is not left open. Client-side Firestore
 * writes do not exist in this app — Cue lost real leads to that pattern.
 *
 * Storage is the source of truth; the notification email is best-effort and
 * its failure never fails the submission. Logs carry masked identifiers only.
 */

const RATE_LIMIT_COLLECTION = "contactRateLimits";
const RATE_POLICY = { max: 5, windowMs: 10 * 60 * 1000 }; // Cue baseline: 5 per 10 min per IP

function unavailable() {
  return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "validation", field: "body" },
      { status: 422 }
    );
  }

  const result = validateSubmission(body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "validation", field: result.field },
      { status: 422 }
    );
  }
  const data = result.data;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const token =
    typeof (body as Record<string, unknown>).turnstileToken === "string"
      ? ((body as Record<string, unknown>).turnstileToken as string)
      : undefined;

  const turnstile = await verifyTurnstile(token, ip === "unknown" ? undefined : ip);
  if (turnstile === "fail") {
    return NextResponse.json({ ok: false, error: "turnstile" }, { status: 400 });
  }
  if (turnstile === "unconfigured") {
    console.error("[contact] Turnstile secret unset in production");
    return unavailable();
  }

  let db;
  try {
    db = getAdminDb();
  } catch (err) {
    console.error("[contact] admin unconfigured:", err instanceof Error ? err.message : err);
    return unavailable();
  }

  let ipHash: string;
  try {
    ipHash = hashIdentifier(ip);
  } catch (err) {
    console.error("[contact] hash salt missing:", err instanceof Error ? err.message : err);
    return unavailable();
  }

  try {
    const limited = await consumeRateLimit(db, RATE_LIMIT_COLLECTION, ipHash, RATE_POLICY);
    if (limited) {
      return NextResponse.json({ ok: false, error: "rate-limited" }, { status: 429 });
    }
  } catch (err) {
    // The limiter must fail CLOSED: if the counter transaction errors we
    // refuse the request rather than silently letting it through unmetered.
    console.error("[contact] rate limit errored:", err instanceof Error ? err.message : err);
    return unavailable();
  }

  try {
    const collection =
      data.kind === "careers" ? "careerSubmissions" : "contactSubmissions";
    await db.collection(collection).add({
      name: data.name,
      email: data.email,
      message: data.message,
      ...(data.link ? { link: data.link } : {}),
      utm: data.utm,
      ipHash,
      userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });

    const emailOutcome = await sendSubmissionEmail(data);
    console.log(
      `[contact] stored ${data.kind} submission from ${maskEmail(data.email)} (email: ${emailOutcome})`
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      `[contact] store failed for ${maskEmail(data.email)}:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
