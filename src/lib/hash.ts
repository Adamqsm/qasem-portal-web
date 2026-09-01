import { createHash } from "node:crypto";

/**
 * Salted one-way hash for every identifier we persist (rate-limit keys).
 * The salt is IP_HASH_SALT and has deliberately NO production default:
 * hashing addresses with a guessable salt would only pretend to be
 * pseudonymous. In production a missing salt throws — callers map that to a
 * 503, failing closed rather than storing raw addresses or unsalted hashes.
 */
export function hashIdentifier(value: string): string {
  let salt = process.env.IP_HASH_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("IP_HASH_SALT is required in production.");
    }
    salt = "dev-only-salt";
  }
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}
