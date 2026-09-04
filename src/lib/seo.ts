import type { Metadata } from "next";
import {
  CUE_ORG_ID,
  CUE_URL,
  KEYWORDS,
  KNOWS_ABOUT,
  SAME_AS,
  SITE_DESCRIPTION,
  SITE_DISAMBIGUATION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

type BuildArgs = {
  /** App-relative path, e.g. "" or "/portfolio". */
  path: string;
  title: string;
  description: string;
  /** Page-specific keywords, prepended to the site-wide set. */
  keywords?: readonly string[];
  /**
   * Suppress the root layout's `%s · Qasem Portal` template. Only the
   * homepage sets this: its title already opens with the brand, and the
   * template would append it a second time if the page ever moved out of
   * the root segment.
   */
  absoluteTitle?: boolean;
};

/**
 * Per-page metadata: title, description, keywords, canonical, Open Graph /
 * Twitter. The OG image is attached automatically by Next from each route's
 * opengraph-image file.
 *
 * No `alternates.languages` and no hreflang: the site is English only, and a
 * self-referential or invented hreflang pair is a real ranking hazard rather
 * than a neutral one. If a second language is ever added, this is the single
 * place it goes, alongside `openGraph.locale`.
 */
export function buildMetadata({
  path,
  title,
  description,
  keywords = [],
  absoluteTitle = false,
}: BuildArgs): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords: [...keywords, ...KEYWORDS],
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

/** The canonical node ids the whole graph hangs off. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * The Organization node, defined once and referenced by `@id` everywhere
 * else, so the graph resolves to one entity rather than five near-copies.
 *
 * `Organization`, never `LocalBusiness`: nobody searches for this company by
 * proximity, there is no premises to visit, and there are no opening hours to
 * publish. The Dubai registration stays as a `PostalAddress` locality and a
 * `foundingLocation` because it is a true and load-bearing fact about the
 * company, but it is stated, not targeted. There is deliberately no geo
 * coordinate, no service area, and no locality-shaped keyword anywhere in
 * this file: the audience is any investor or counterparty, anywhere.
 *
 * Facts only. No invented street address, phone, founding date, headcount,
 * or legal entity name. The graph carries what the site itself states,
 * nothing more.
 *
 * `subOrganization` is schema.org vocabulary rather than site copy, and it is
 * the single most valuable line here: it is what lets a search engine answer
 * the question of which company stands behind Cue, by joining this graph to
 * the Organization node Cue-web publishes at the same `@id`.
 */
function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/favicon-512.png`,
    description: SITE_DESCRIPTION,
    disambiguatingDescription: SITE_DISAMBIGUATION,
    knowsAbout: [...KNOWS_ABOUT],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dubai",
      addressCountry: "AE",
    },
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Dubai",
        addressCountry: "AE",
      },
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "General inquiries",
      url: `${SITE_URL}/contact`,
      availableLanguage: "English",
    },
    subOrganization: {
      "@type": "Organization",
      "@id": CUE_ORG_ID,
      name: "Cue",
      url: CUE_URL,
    },
    ...(SAME_AS.length > 0 ? { sameAs: [...SAME_AS] } : {}),
  };
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en-US",
    publisher: { "@id": ORG_ID },
  };
}

/**
 * The breadcrumb trail for a page, as a list of crumbs ending with the page
 * itself. Home is prepended for you.
 */
function breadcrumbNode(
  url: string,
  trail: readonly { label: string; path: string }[]
) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [{ label: "Home", path: "" }, ...trail].map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

type PageArgs = {
  path: string;
  name: string;
  description: string;
  /** Defaults to WebPage; ContactPage and CollectionPage are the two used. */
  type?: "WebPage" | "ContactPage" | "CollectionPage";
  /** Crumbs between Home and this page. Rarely needed at this depth. */
  trail?: readonly { label: string; path: string }[];
  /** Extra nodes appended to the graph, e.g. the portfolio's ItemList. */
  extraNodes?: readonly Record<string, unknown>[];
  /** Extra properties merged onto the page node, e.g. `mainEntity`. */
  pageProps?: Record<string, unknown>;
};

/**
 * The graph for a page: the page node, its breadcrumb, and the Organization
 * and WebSite nodes by reference.
 *
 * Those two are emitted in full on the homepage only (see `siteJsonLd`);
 * every other page cites them by `@id`, which is what a `@graph` is for and
 * what keeps the entity single.
 */
export function pageJsonLd({
  path,
  name,
  description,
  type = "WebPage",
  trail = [],
  extraNodes = [],
  pageProps = {},
}: PageArgs) {
  const url = `${SITE_URL}${path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": `${url}#webpage`,
        url,
        name,
        description,
        inLanguage: "en-US",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORG_ID },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        ...pageProps,
      },
      breadcrumbNode(url, [...trail, { label: name, path }]),
      ...extraNodes,
    ],
  };
}

/**
 * The homepage graph: the full Organization and WebSite definitions plus the
 * page node. This is the one page that defines the entity; the rest cite it.
 */
export function siteJsonLd() {
  const url = SITE_URL;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en-US",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORG_ID },
      },
    ],
  };
}

/**
 * The portfolio graph. The venture register is marked up as an `ItemList`
 * whose one entry is Cue's canonical Organization node, cited by the same
 * `@id` the homepage uses and that Cue-web publishes. The point is not the
 * list markup; it is that Cue's identity is asserted twice, consistently,
 * from the two pages a crawler is most likely to read.
 *
 * Cue is typed `Organization` rather than `SoftwareApplication` because the
 * `@id` being joined is an organisation node, and because application markup
 * would mean asserting store URLs, ratings, and offers this site does not
 * have.
 */
export function portfolioJsonLd() {
  const path = "/portfolio";
  const url = `${SITE_URL}${path}`;
  return pageJsonLd({
    path,
    name: "Portfolio",
    description: "The ventures of Qasem Portal.",
    type: "CollectionPage",
    pageProps: { mainEntity: { "@id": `${url}#ventures` } },
    extraNodes: [
      {
        "@type": "ItemList",
        "@id": `${url}#ventures`,
        name: "Ventures",
        numberOfItems: 1,
        itemListOrder: "https://schema.org/ItemListUnordered",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            item: {
              "@type": "Organization",
              "@id": CUE_ORG_ID,
              name: "Cue",
              url: CUE_URL,
              description:
                "Cue is a restaurant reservation and venue booking app, operating in Amman, Jordan.",
            },
          },
        ],
      },
    ],
  });
}
