import { describe, expect, it } from "vitest";
import { isProductionDeploy } from "../analytics";
import { parseConsent } from "../consent";

describe("parseConsent", () => {
  it("accepts only the two stored values", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
  });
  it("treats anything else as no choice yet", () => {
    for (const raw of [null, undefined, "", "true", "GRANTED", "yes"]) {
      expect(parseConsent(raw)).toBeNull();
    }
  });
});

describe("isProductionDeploy", () => {
  it("is true on the Vercel production deployment only", () => {
    expect(isProductionDeploy("production")).toBe(true);
    expect(isProductionDeploy("preview")).toBe(false);
    expect(isProductionDeploy("development")).toBe(false);
    expect(isProductionDeploy(undefined)).toBe(false);
  });
});
