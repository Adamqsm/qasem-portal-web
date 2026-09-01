import { describe, expect, it } from "vitest";
import { LIMITS, validateSubmission } from "../validation";

const base = {
  kind: "general",
  name: "Adam Qasem",
  email: "Person@Example.com",
  message: "A perfectly reasonable message.",
};

describe("validateSubmission", () => {
  it("accepts a valid general submission and normalises the email", () => {
    const r = validateSubmission(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.email).toBe("person@example.com");
      expect(r.data.kind).toBe("general");
      expect(r.data.link).toBeUndefined();
      expect(r.data.utm).toBeNull();
    }
  });

  it("rejects non-object bodies", () => {
    for (const bad of [null, undefined, "x", 5, []]) {
      const r = validateSubmission(bad);
      expect(r).toEqual({ ok: false, field: "body" });
    }
  });

  it("rejects unknown kinds", () => {
    const r = validateSubmission({ ...base, kind: "partner" });
    expect(r).toEqual({ ok: false, field: "kind" });
  });

  it("enforces name bounds", () => {
    expect(validateSubmission({ ...base, name: "A" }).ok).toBe(false);
    expect(
      validateSubmission({ ...base, name: "x".repeat(LIMITS.name.max + 1) }).ok
    ).toBe(false);
    expect(validateSubmission({ ...base, name: "  Jo  " }).ok).toBe(true);
  });

  it("caps the raw email before any processing", () => {
    const r = validateSubmission({
      ...base,
      email: `${"x".repeat(LIMITS.email.max)}@example.com`,
    });
    expect(r).toEqual({ ok: false, field: "email" });
  });

  it("rejects malformed emails", () => {
    for (const bad of ["", "plain", "a@b", "a b@c.com", "@x.com"]) {
      expect(validateSubmission({ ...base, email: bad })).toEqual({
        ok: false,
        field: "email",
      });
    }
  });

  it("enforces message bounds on the trimmed value", () => {
    expect(validateSubmission({ ...base, message: "short" }).ok).toBe(false);
    expect(
      validateSubmission({ ...base, message: " ".repeat(50) + "hi" }).ok
    ).toBe(false);
    expect(
      validateSubmission({ ...base, message: "x".repeat(LIMITS.message.max + 1) })
        .ok
    ).toBe(false);
  });

  it("careers: accepts a missing or empty link", () => {
    expect(validateSubmission({ ...base, kind: "careers" }).ok).toBe(true);
    const r = validateSubmission({ ...base, kind: "careers", link: "  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.link).toBeUndefined();
  });

  it("careers: accepts an https link and rejects other schemes", () => {
    const good = validateSubmission({
      ...base,
      kind: "careers",
      link: "https://www.linkedin.com/in/someone",
    });
    expect(good.ok).toBe(true);
    for (const bad of ["javascript:alert(1)", "ftp://x.com", "not a url"]) {
      expect(
        validateSubmission({ ...base, kind: "careers", link: bad })
      ).toEqual({ ok: false, field: "link" });
    }
  });

  it("general: ignores a link field entirely", () => {
    const r = validateSubmission({ ...base, link: "javascript:alert(1)" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.link).toBeUndefined();
  });

  it("sanitizes utm without ever rejecting on it", () => {
    const r = validateSubmission({
      ...base,
      utm: { utm_source: "linkedin", utm_junk: "drop", utm_medium: 42 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.utm).toEqual({ utm_source: "linkedin" });
    const r2 = validateSubmission({ ...base, utm: "garbage" });
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.data.utm).toBeNull();
  });
});
