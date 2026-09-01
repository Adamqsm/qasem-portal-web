import { describe, expect, it } from "vitest";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { consumeRateLimit, type RateLimitPolicy } from "../rate-limit";

const POLICY: RateLimitPolicy = { max: 5, windowMs: 10 * 60 * 1000 };

type Counter = { count: number; windowStart: Timestamp };

/**
 * In-memory stand-in for the two Firestore calls consumeRateLimit makes
 * (same fake as Cue-web's suite). `update` is only ever called with
 * FieldValue.increment(1), so the fake applies that directly.
 */
function makeDb() {
  const store = new Map<string, Counter>();
  const db = {
    collection: (collection: string) => ({
      doc: (key: string) => ({ path: `${collection}/${key}` }),
    }),
    runTransaction: async <T>(fn: (txn: unknown) => Promise<T>): Promise<T> =>
      fn({
        get: async (ref: { path: string }) => {
          const data = store.get(ref.path);
          return { exists: data !== undefined, data: () => data };
        },
        set: (ref: { path: string }, value: Counter) => store.set(ref.path, value),
        update: (ref: { path: string }) => {
          const current = store.get(ref.path);
          if (current) store.set(ref.path, { ...current, count: current.count + 1 });
        },
      }),
  };
  return { db: db as unknown as Firestore, store };
}

const hit = (db: Firestore, key = "ip-hash", collection = "contactRateLimits") =>
  consumeRateLimit(db, collection, key, POLICY);

describe("consumeRateLimit", () => {
  it("allows exactly `max` requests, then rejects", async () => {
    const { db } = makeDb();
    for (let i = 0; i < POLICY.max; i++) {
      expect(await hit(db)).toBe(false);
    }
    expect(await hit(db)).toBe(true);
  });

  it("does not let a rejected caller extend its own window", async () => {
    const { db, store } = makeDb();
    for (let i = 0; i < POLICY.max; i++) await hit(db);
    const before = store.get("contactRateLimits/ip-hash")!;
    await hit(db);
    await hit(db);
    const after = store.get("contactRateLimits/ip-hash")!;
    expect(after.count).toBe(POLICY.max);
    expect(after.windowStart.toMillis()).toBe(before.windowStart.toMillis());
  });

  it("starts a fresh window once the old one has lapsed", async () => {
    const { db, store } = makeDb();
    store.set("contactRateLimits/ip-hash", {
      count: POLICY.max,
      windowStart: Timestamp.fromMillis(Date.now() - POLICY.windowMs - 1),
    });
    expect(await hit(db)).toBe(false);
    expect(store.get("contactRateLimits/ip-hash")!.count).toBe(1);
  });

  it("still limits inside a window that has not lapsed", async () => {
    const { db, store } = makeDb();
    store.set("contactRateLimits/ip-hash", {
      count: POLICY.max,
      windowStart: Timestamp.fromMillis(Date.now() - POLICY.windowMs + 5_000),
    });
    expect(await hit(db)).toBe(true);
  });

  it("keeps separate keys on separate budgets", async () => {
    const { db } = makeDb();
    for (let i = 0; i < POLICY.max; i++) await hit(db);
    expect(await hit(db)).toBe(true);
    expect(await hit(db, "other-ip-hash")).toBe(false);
  });
});
