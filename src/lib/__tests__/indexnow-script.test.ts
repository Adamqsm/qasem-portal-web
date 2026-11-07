import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The deploy Action must never go red: a key file that is not live yet is a
 * quiet skip, and with --soft every other failure is a warning. Port 9 on
 * localhost refuses connections, so no network is needed.
 */
const run = (...args: string[]) =>
  spawnSync(process.execPath, ["scripts/indexnow.mjs", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, INDEXNOW_SITE: "http://127.0.0.1:9" },
    encoding: "utf8",
    timeout: 30_000,
  });

describe("scripts/indexnow.mjs", () => {
  it("skips quietly, exit 0, when the key file is not live", () => {
    for (const mode of [[], ["--soft"]]) {
      const r = run(...mode);
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/::notice title=IndexNow::.*is not live yet; nothing submitted\./);
    }
  });

  it("is wired into the deploy workflow in soft mode, never failing the run", () => {
    const yml = readFileSync(join(process.cwd(), ".github/workflows/indexnow.yml"), "utf8");
    expect(yml).toContain("deployment_status:");
    expect(yml).toContain("startsWith(github.event.deployment.environment, 'Production')");
    expect(yml).toContain("continue-on-error: true");
    expect(yml).toContain("node scripts/indexnow.mjs --soft");
  });
});
