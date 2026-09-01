import type { Metadata } from "next";
import { CUE_ORG_ID, CUE_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

type BuildArgs = {
  /** App-relative path, e.g. "" or "/portfolio". */
  path: string;
  title: string;
  description: string;
};

/**
 * Per-page metadata: title, description, canonical, Open Graph / Twitter.
 * The OG image is attached automatically by Next from each route's
 * opengraph-image file.
 */
export function buildMetadata({ path, title, description }: BuildArgs): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/**
 * Organization + WebSite graph for the homepage.
 *
 * Facts only: name, Dubai registration, and the subOrganization link to Cue's
 * own canonical Organization node (`${CUE_URL}/#organization`), so the two
 * sites' graphs join. No invented street address, phone, or founding date —
 * the graph carries what the site itself states, nothing more.
 */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/brand/favicon-512.png`,
        description: SITE_DESCRIPTION,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Dubai",
          addressCountry: "AE",
        },
        subOrganization: {
          "@type": "Organization",
          "@id": CUE_ORG_ID,
          name: "Cue",
          url: CUE_URL,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "en-US",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}
