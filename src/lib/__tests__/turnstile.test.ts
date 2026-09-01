import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "../turnstile";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function stubFetch(response: Partial<Response> | Error) {
  const fn = vi.fn(async (..._args: unknown[]) => {
    if (response instanceof Error) throw response;
    return response as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("verifyTurnstile", () => {
  it("fails closed (unconfigured) in production with no secret", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    const fetchFn = stubFetch(new Error("must not be called"));
    expect(await verifyTurnstile("token", "1.2.3.4")).toBe("unconfigured");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rejects a missing token without calling Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const fetchFn = stubFetch(new Error("must not be called"));
    expect(await verifyTurnstile(undefined, "1.2.3.4")).toBe("fail");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("passes a successful verification", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const fetchFn = stubFetch({
      ok: true,
      json: async () => ({ success: true }),
    } as unknown as Response);
    expect(await verifyTurnstile("token", "1.2.3.4")).toBe("ok");
    const call = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    const body = String(call[1].body);
    expect(body).toContain("response=token");
    expect(body).toContain("remoteip=1.2.3.4");
  });

  it("fails on an unsuccessful verification", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    stubFetch({ ok: true, json: async () => ({ success: false }) } as unknown as Response);
    expect(await verifyTurnstile("token", undefined)).toBe("fail");
  });

  it("fails on HTTP errors and network errors", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    stubFetch({ ok: false } as unknown as Response);
    expect(await verifyTurnstile("token", undefined)).toBe("fail");
    stubFetch(new Error("boom"));
    expect(await verifyTurnstile("token", undefined)).toBe("fail");
  });
});
