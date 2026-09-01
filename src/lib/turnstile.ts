const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Cloudflare's documented always-pass secret — dev/test fallback only. */
const TEST_ALWAYS_PASS_SECRET = "1x0000000000000000000000000000000AA";

export type TurnstileResult = "ok" | "fail" | "unconfigured";

/**
 * Ported from Cue-web. "unconfigured" is only returned in production with no
 * TURNSTILE_SECRET_KEY — the route fails closed (503) rather than accepting
 * unverified traffic.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip: string | undefined
): Promise<TurnstileResult> {
  let secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return "unconfigured";
    secret = TEST_ALWAYS_PASS_SECRET;
  }
  if (!token) return "fail";

  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set("remoteip", ip);
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) return "fail";
    const data = (await res.json()) as { success?: boolean };
    return data.success === true ? "ok" : "fail";
  } catch {
    return "fail";
  }
}
