import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";

/**
 * Fixed-window IP rate limiting on a Firestore counter collection, ported
 * verbatim from Cue-web (where it meters the Cue Insider claim flow and the
 * partner application form).
 *
 * Document id is a SALTED hash of the IP (see hash.ts), never the address
 * itself. Documents are `{ count, windowStart }`.
 */

export type RateLimitPolicy = {
  /** Requests allowed per window. */
  max: number;
  /** Window length in ms. Fixed, not sliding: the window restarts on the first
   *  request after it lapses. */
  windowMs: number;
};

/**
 * Count one request against `key` and report whether it should be REJECTED.
 *
 * Runs in its own transaction, separate from whatever the caller does next:
 * the count must commit even if the caller's own transaction retries, and it
 * keeps that transaction read-then-write only (the Admin SDK requires every
 * read to precede the first write).
 *
 * Returns true when the caller is over the limit — the request is not counted
 * again in that case, so a client hammering a limited endpoint cannot extend
 * its own window.
 */
export async function consumeRateLimit(
  db: Firestore,
  collection: string,
  key: string,
  policy: RateLimitPolicy
): Promise<boolean> {
  const ref = db.collection(collection).doc(key);
  return db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const now = Timestamp.now();
    const data = snap.data();
    const windowStart = data?.windowStart as Timestamp | undefined;
    if (!snap.exists || !windowStart || now.toMillis() - windowStart.toMillis() >= policy.windowMs) {
      txn.set(ref, { count: 1, windowStart: now });
      return false;
    }
    if (((data?.count as number | undefined) ?? 0) >= policy.max) return true;
    txn.update(ref, { count: FieldValue.increment(1) });
    return false;
  });
}
