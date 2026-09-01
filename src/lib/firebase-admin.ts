import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Lazy Admin SDK singleton, ported from Cue-web. Configured by either:
 * - FIRESTORE_EMULATOR_HOST (local dev/tests — no credentials needed), or
 * - FIREBASE_SERVICE_ACCOUNT_JSON (raw or base64-encoded service-account JSON).
 * Callers map the thrown Error to a 503: an endpoint we cannot persist or
 * rate limit is not one to leave open.
 *
 * There is deliberately NO client-side Firebase SDK in this app; this module
 * is the only Firestore path, and it bypasses (deny-all) security rules.
 */

let db: Firestore | null = null;

function parseServiceAccount(raw: string): ServiceAccount {
  const text = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(text) as ServiceAccount;
}

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "qasem-portal-demo",
    });
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "Firebase Admin unconfigured: set FIREBASE_SERVICE_ACCOUNT_JSON (raw or base64 service-account JSON) or FIRESTORE_EMULATOR_HOST."
    );
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = parseServiceAccount(raw);
  } catch {
    throw new Error(
      "Firebase Admin unconfigured: FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (raw or base64)."
    );
  }

  return initializeApp({ credential: cert(serviceAccount) });
}

export function getAdminDb(): Firestore {
  if (!db) db = getFirestore(getAdminApp());
  return db;
}
