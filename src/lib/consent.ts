/** The visitor's analytics choice, kept on their device only. */
export const CONSENT_KEY = "qp-analytics-consent";

export type Consent = "granted" | "denied";

export function parseConsent(raw: string | null | undefined): Consent | null {
  return raw === "granted" || raw === "denied" ? raw : null;
}

export function readConsent(): Consent | null {
  try {
    return parseConsent(localStorage.getItem(CONSENT_KEY));
  } catch {
    return null;
  }
}

export function writeConsent(consent: Consent): void {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
}

/**
 * Forget the choice and the Google Analytics cookies, then reload so the
 * banner returns and no analytics script stays loaded.
 * shortcut: expires the cookies on this host and its parent domain only, upgrade
 * if Analytics is ever configured with another cookie_domain.
 */
export function resetConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Nothing stored, nothing to clear.
  }
  const host = location.hostname;
  const parent = host.split(".").slice(-2).join(".");
  for (const name of document.cookie.split(";").map((c) => c.split("=")[0]!.trim())) {
    if (!name.startsWith("_ga")) continue;
    for (const domain of [host, `.${parent}`]) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}`;
    }
  }
  location.reload();
}
