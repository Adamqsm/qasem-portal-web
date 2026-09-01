import { afterEach, describe, expect, it, vi } from "vitest";
import { hashIdentifier } from "../hash";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hashIdentifier", () => {
  it("is deterministic for the same salt and value", () => {
    vi.stubEnv("IP_HASH_SALT", "salt-a");
    const a = hashIdentifier("1.2.3.4");
    const b = hashIdentifier("1.2.3.4");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes with the salt (unsalted rainbow tables are useless)", () => {
    vi.stubEnv("IP_HASH_SALT", "salt-a");
    const a = hashIdentifier("1.2.3.4");
    vi.stubEnv("IP_HASH_SALT", "salt-b");
    const b = hashIdentifier("1.2.3.4");
    expect(a).not.toBe(b);
  });

  it("throws in production when the salt is missing (fail closed)", () => {
    vi.stubEnv("IP_HASH_SALT", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => hashIdentifier("1.2.3.4")).toThrow(/IP_HASH_SALT/);
  });

  it("falls back to a dev salt outside production", () => {
    vi.stubEnv("IP_HASH_SALT", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(hashIdentifier("1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
  });
});
