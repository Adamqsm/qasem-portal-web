import { describe, expect, it } from "vitest";
import { sanitizeUtm, utmFromSearch, withUtm } from "../utm";

describe("sanitizeUtm", () => {
  it("whitelists keys and drops junk", () => {
    expect(
      sanitizeUtm({ utm_source: "linkedin", utm_evil: "x", other: 1 })
    ).toEqual({ utm_source: "linkedin" });
  });

  it("strips control characters and clamps length", () => {
    const r = sanitizeUtm({ utm_campaign: "a\x00b\x1fc" + "x".repeat(500) });
    expect(r?.utm_campaign?.startsWith("abc")).toBe(true);
    expect(r?.utm_campaign?.length).toBe(200);
  });

  it("returns null for empty or non-object input", () => {
    expect(sanitizeUtm({})).toBeNull();
    expect(sanitizeUtm(null)).toBeNull();
    expect(sanitizeUtm([])).toBeNull();
    expect(sanitizeUtm("utm_source=x")).toBeNull();
    expect(sanitizeUtm({ utm_source: "   " })).toBeNull();
  });
});

describe("utmFromSearch", () => {
  it("parses utm params out of a query string", () => {
    expect(
      utmFromSearch("?utm_source=linkedin&utm_medium=social&foo=1")
    ).toEqual({ utm_source: "linkedin", utm_medium: "social" });
  });

  it("returns null when nothing relevant is present", () => {
    expect(utmFromSearch("")).toBeNull();
    expect(utmFromSearch("?foo=1")).toBeNull();
  });
});

describe("withUtm", () => {
  it("tags internal links with their placement", () => {
    expect(withUtm("/contact", "hero")).toBe(
      "/contact?utm_source=qasem-site&utm_medium=internal&utm_content=hero"
    );
  });

  it("appends with & when a query already exists", () => {
    expect(withUtm("/contact?x=1", "cta")).toContain("?x=1&utm_source=");
  });
});
