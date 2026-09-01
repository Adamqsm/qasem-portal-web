import { afterEach, describe, expect, it, vi } from "vitest";
import { sendSubmissionEmail } from "../email";
import type { SubmissionData } from "../validation";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const data: SubmissionData = {
  kind: "careers",
  name: "Jo Doe",
  email: "jo@example.com",
  message: "Hello there, this is an introduction.",
  link: "https://www.linkedin.com/in/jodoe",
  utm: { utm_source: "linkedin" },
};

describe("sendSubmissionEmail", () => {
  it("skips silently when no API key is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchFn = vi.fn();
    vi.stubGlobal("fetch", fetchFn);
    expect(await sendSubmissionEmail(data)).toBe("skipped");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends a text-only payload with reply-to the submitter", async () => {
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("CONTACT_INBOX", "inbox@qasem-portal.com");
    vi.stubEnv("MAIL_FROM", "Qasem Portal <notifications@qasem-portal.com>");
    const fetchFn = vi.fn(async (..._args: unknown[]) => ({ ok: true }) as Response);
    vi.stubGlobal("fetch", fetchFn);

    expect(await sendSubmissionEmail(data)).toBe("sent");
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const payload = JSON.parse(String(init.body));
    expect(payload.to).toEqual(["inbox@qasem-portal.com"]);
    expect(payload.reply_to).toBe("jo@example.com");
    expect(payload.subject).toBe("New careers introduction via qasem-portal.com");
    expect(payload.text).toContain("Link: https://www.linkedin.com/in/jodoe");
    expect(payload.text).toContain("utm_source=linkedin");
    // Text-only: no html field means nothing can carry a tracking pixel.
    expect(payload.html).toBeUndefined();
  });

  it("reports failure without throwing, and logs only a masked address", async () => {
    vi.stubEnv("RESEND_API_KEY", "key");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    expect(await sendSubmissionEmail(data)).toBe("failed");
    const logged = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toContain("j***@example.com");
    expect(logged).not.toContain("jo@example.com");
  });

  it("treats a thrown fetch as failure, not an exception", async () => {
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("net down"); }));
    expect(await sendSubmissionEmail(data)).toBe("failed");
  });
});
