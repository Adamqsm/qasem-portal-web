/** Canonical site origin — the www host; apex 308s to it at the platform. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qasem-portal.com";

export const SITE_NAME = "Qasem Portal";

/** One sentence, reused as the default meta description and JSON-LD text. */
export const SITE_DESCRIPTION =
  "Qasem Portal is a technology company building modern applications for hospitality and adjacent sectors. Registered in Dubai, United Arab Emirates.";

/**
 * The one-paragraph identity statement, written for machines rather than for
 * the page: it exists to separate this company from the other organisations
 * that share the Qasem name in search results. Every clause traces to copy
 * the site itself states.
 */
export const SITE_DISAMBIGUATION =
  "A technology company registered in Dubai, United Arab Emirates, that builds and operates app-driven ventures for hospitality and adjacent sectors. Cue, a restaurant reservation and venue booking app operating in Amman, Jordan, is its first venture.";

/** Cue's canonical origin and Organization node id (matches Cue-web's graph). */
export const CUE_URL = "https://www.cue-app.net";
export const CUE_ORG_ID = `${CUE_URL}/#organization`;

/**
 * Verified profiles the company controls, emitted as `Organization.sameAs`.
 *
 * Deliberately empty. `sameAs` is the strongest entity-resolution signal
 * available to a site with no press coverage, but every entry has to be a
 * profile that actually exists and that Qasem Portal actually owns; a broken
 * or borrowed URL here is worse than no URL at all. Add the company LinkedIn
 * page the day it exists (Cue's own graph carries
 * `https://www.linkedin.com/company/cuebooking`), then re-run the Rich
 * Results test.
 */
export const SAME_AS: string[] = [];

/**
 * Topics the company is about. Not claims about size, funding, or structure —
 * just the subject matter, which is what `knowsAbout` is for.
 */
export const KNOWS_ABOUT = [
  "Hospitality technology",
  "Restaurant reservation software",
  "Mobile application development",
  "Venture building",
] as const;

/**
 * Keyword sets woven into metadata. These are not visible copy; the reading
 * copy lives in the page files and is governed by its own rules.
 *
 * Priority order is deliberate and is the whole strategy in miniature: this
 * is a five-page corporate register with no content depth and no backlinks,
 * so it cannot win contested category head terms. What it can own outright,
 * and quickly, is its own entity — the searches of someone who already met
 * the name, most often through Cue, and wants to know what company stands
 * behind it. Those are the investor and business-development searches worth
 * catching. Category vocabulary follows as support, not as the target.
 *
 * Note the two words that are absent by rule: the company is never described
 * with the word "holding", and the relationship to Cue is never framed as
 * "parent", "above", or "under". "company behind Cue" catches the same search
 * intent without adopting the framing.
 */
export const KEYWORDS = [
  "Qasem Portal",
  "Qasem Portal Dubai",
  "company behind Cue",
  "Cue app company",
  "technology company Dubai",
  "venture builder",
  "app-driven ventures",
  "hospitality technology company",
  "restaurant reservation technology",
] as const;

export const NAV_ITEMS = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * The route register: every indexable page, its human label (used for
 * breadcrumbs) and the date its content or metadata last changed materially.
 *
 * `lastModified` is a hand-kept constant on purpose. Stamping build time
 * would move every date on every deploy, which teaches a crawler that the
 * dates mean nothing. Bump the entry when the page actually changes.
 */
export const PAGES = [
  { path: "", label: "Home", lastModified: "2026-09-04", changeFrequency: "monthly" },
  { path: "/portfolio", label: "Portfolio", lastModified: "2026-09-04", changeFrequency: "monthly" },
  { path: "/careers", label: "Career Growth and Learning", lastModified: "2026-09-04", changeFrequency: "yearly" },
  { path: "/contact", label: "Contact", lastModified: "2026-09-04", changeFrequency: "yearly" },
  { path: "/legal/privacy", label: "Privacy Policy", lastModified: "2026-09-02", changeFrequency: "yearly" },
  { path: "/legal/terms", label: "Terms of Use", lastModified: "2026-09-02", changeFrequency: "yearly" },
] as const;
