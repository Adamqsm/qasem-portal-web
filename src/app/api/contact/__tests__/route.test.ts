import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Full status matrix for POST /api/contact with the infrastructure mocked at
 * module seams: Turnstile, the Admin DB, the rate limiter, and the email
 * sender. What stays real: validation, hashing (dev salt), and the route's
 * own ordering/fail-closed logic — which is what these tests pin down.
 */

const mocks = vi.hoisted(() => ({
  verifyTurnstile: vi.fn(),
  getAdminDb: vi.fn(),
  consumeRateLimit: vi.fn(),
  sendSubmissionEmail: vi.fn(),
}));

vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: mocks.verifyTurnstile }));
vi.mock("@/lib/firebase-admin", () => ({ getAdminDb: mocks.getAdminDb }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: mocks.consumeRateLimit }));
vi.mock("@/lib/email", () => ({ sendSubmissionEmail: mocks.sendSubmissionEmail }));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "SERVER_TS" },
}));

import { POST } from "../route";

type StoredDoc = { collection: string; doc: Record<string, unknown> };

function makeFakeDb(opts: { addThrows?: boolean } = {}) {
  const stored: StoredDoc[] = [];
  const db = {
    collection: (collection: string) => ({
      add: async (doc: Record<string, unknown>) => {
        if (opts.addThrows) throw new Error("firestore down");
        stored.push({ collection, doc });
        return { id: "doc-1" };
      },
    }),
  };
  return { db, stored };
}

const VALID = {
  kind: "general",
  name: "Adam Qasem",
  email: "sender@example.com",
  message: "A perfectly reasonable message.",
  turnstileToken: "tok",
  utm: { utm_source: "linkedin", utm_bogus: "drop" },
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        "user-agent": "vitest-agent",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

let fake: ReturnType<typeof makeFakeDb>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  fake = makeFakeDb();
  mocks.verifyTurnstile.mockResolvedValue("ok");
  mocks.getAdminDb.mockReturnValue(fake.db);
  mocks.consumeRateLimit.mockResolvedValue(false);
  mocks.sendSubmissionEmail.mockResolvedValue("sent");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/contact", () => {
  it("422s on malformed JSON", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: "validation", field: "body" });
  });

  it("422s on a validation failure with the failing field", async () => {
    const res = await post({ ...VALID, email: "nope" });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ field: "email" });
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("400s when Turnstile rejects, before any storage work", async () => {
    mocks.verifyTurnstile.mockResolvedValue("fail");
    const res = await post(VALID);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "turnstile" });
    expect(mocks.getAdminDb).not.toHaveBeenCalled();
    expect(fake.stored).toHaveLength(0);
  });

  it("503s (fail closed) when Turnstile is unconfigured in production", async () => {
    mocks.verifyTurnstile.mockResolvedValue("unconfigured");
    const res = await post(VALID);
    expect(res.status).toBe(503);
  });

  it("503s (fail closed) when the Admin SDK is unconfigured", async () => {
    mocks.getAdminDb.mockImplementation(() => {
      throw new Error("no creds");
    });
    const res = await post(VALID);
    expect(res.status).toBe(503);
    expect(fake.stored).toHaveLength(0);
  });

  it("429s when the rate limit is exceeded, without storing", async () => {
    mocks.consumeRateLimit.mockResolvedValue(true);
    const res = await post(VALID);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: "rate-limited" });
    expect(fake.stored).toHaveLength(0);
  });

  it("503s (fail closed) when the rate limiter itself errors", async () => {
    mocks.consumeRateLimit.mockRejectedValue(new Error("txn broke"));
    const res = await post(VALID);
    expect(res.status).toBe(503);
    expect(fake.stored).toHaveLength(0);
  });

  it("stores a general submission with a hashed IP, never the address", async () => {
    const res = await post(VALID);
    expect(res.status).toBe(200);
    expect(fake.stored).toHaveLength(1);
    const { collection, doc } = fake.stored[0];
    expect(collection).toBe("contactSubmissions");
    expect(doc.name).toBe("Adam Qasem");
    expect(doc.email).toBe("sender@example.com");
    expect(doc.utm).toEqual({ utm_source: "linkedin" });
    expect(doc.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.createdAt).toBe("SERVER_TS");
    expect(doc.status).toBe("new");
    expect(JSON.stringify(doc)).not.toContain("203.0.113.7");
    // The limiter was keyed on the same hash, first client IP in the chain.
    const key = mocks.consumeRateLimit.mock.calls[0][2];
    expect(key).toBe(doc.ipHash);
  });

  it("stores careers submissions in their own collection, with the link", async () => {
    const res = await post({
      ...VALID,
      kind: "careers",
      link: "https://www.linkedin.com/in/someone",
    });
    expect(res.status).toBe(200);
    const { collection, doc } = fake.stored[0];
    expect(collection).toBe("careerSubmissions");
    expect(doc.link).toBe("https://www.linkedin.com/in/someone");
    expect(mocks.sendSubmissionEmail).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "careers" })
    );
  });

  it("still 200s when the notification email fails (storage is the truth)", async () => {
    mocks.sendSubmissionEmail.mockResolvedValue("failed");
    const res = await post(VALID);
    expect(res.status).toBe(200);
    expect(fake.stored).toHaveLength(1);
  });

  it("500s when the store itself throws, with a masked log only", async () => {
    fake = makeFakeDb({ addThrows: true });
    mocks.getAdminDb.mockReturnValue(fake.db);
    const res = await post(VALID);
    expect(res.status).toBe(500);
    const logged = (console.error as ReturnType<typeof vi.fn>).mock.calls
      .map((c: unknown[]) => c.join(" "))
      .join("\n");
    expect(logged).toContain("s***@example.com");
    expect(logged).not.toContain("sender@example.com");
  });

  it("passes a missing token through to Turnstile as undefined", async () => {
    mocks.verifyTurnstile.mockResolvedValue("fail");
    const { turnstileToken: _drop, ...withoutToken } = VALID;
    await post(withoutToken);
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith(undefined, "203.0.113.7");
  });
});
