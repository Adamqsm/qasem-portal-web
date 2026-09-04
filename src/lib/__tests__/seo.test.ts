import { describe, expect, it } from "vitest";
import { buildMetadata, ORG_ID, pageJsonLd, portfolioJsonLd, siteJsonLd } from "@/lib/seo";
import { CUE_ORG_ID, KEYWORDS, PAGES, SITE_URL } from "@/lib/site";

/** Every node in a graph, flattened, so assertions can search the whole tree. */
function walk(value: unknown, out: Record<string, unknown>[] = []) {
  if (Array.isArray(value)) {
    value.forEach((v) => walk(v, out));
  } else if (value && typeof value === "object") {
    out.push(value as Record<string, unknown>);
    Object.values(value).forEach((v) => walk(v, out));
  }
  return out;
}

function graphOf(data: unknown) {
  return (data as { "@graph": Record<string, unknown>[] })["@graph"];
}

function typesOf(data: unknown) {
  return graphOf(data).map((node) => node["@type"]);
}

describe("buildMetadata", () => {
  it("sets a self-referential canonical on the page's own URL", () => {
    expect(buildMetadata({ path: "/portfolio", title: "T", description: "D" }).alternates)
      .toEqual({ canonical: `${SITE_URL}/portfolio` });
  });

  it("emits no hreflang alternates: the site is English only", () => {
    const meta = buildMetadata({ path: "", title: "T", description: "D" });
    expect(meta.alternates).not.toHaveProperty("languages");
    expect(meta.openGraph).toMatchObject({ locale: "en_US" });
  });

  it("carries Open Graph and a large Twitter card with the page's own copy", () => {
    const meta = buildMetadata({ path: "/contact", title: "Contact", description: "D" });
    expect(meta.openGraph).toMatchObject({
      type: "website",
      title: "Contact",
      description: "D",
      url: `${SITE_URL}/contact`,
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Contact",
      description: "D",
    });
  });

  it("prepends page keywords to the site-wide set", () => {
    const meta = buildMetadata({
      path: "",
      title: "T",
      description: "D",
      keywords: ["page term"],
    });
    expect(meta.keywords).toEqual(["page term", ...KEYWORDS]);
  });

  it("applies the title template by default and suppresses it on request", () => {
    expect(buildMetadata({ path: "", title: "T", description: "D" }).title).toBe("T");
    expect(
      buildMetadata({ path: "", title: "T", description: "D", absoluteTitle: true }).title
    ).toEqual({ absolute: "T" });
  });
});

describe("the organization graph", () => {
  it("is an Organization and never a LocalBusiness or any local subtype", () => {
    const types = walk(siteJsonLd()).map((n) => n["@type"]);
    expect(types).toContain("Organization");
    expect(types.join(" ")).not.toMatch(/LocalBusiness|Store|ProfessionalService/);
  });

  it("states the Dubai registration without targeting it: no geo, no service area", () => {
    const org = graphOf(siteJsonLd())[0];
    expect(org.address).toMatchObject({ addressLocality: "Dubai", addressCountry: "AE" });
    const json = JSON.stringify(siteJsonLd());
    expect(json).not.toMatch(/"geo"|GeoCoordinates|areaServed|openingHours/);
  });

  it("asserts no facts the site does not state", () => {
    const org = graphOf(siteJsonLd())[0];
    for (const invented of [
      "foundingDate",
      "numberOfEmployees",
      "telephone",
      "email",
      "legalName",
      "streetAddress",
      "aggregateRating",
    ]) {
      expect(org).not.toHaveProperty(invented);
    }
  });

  it("omits sameAs entirely rather than shipping an empty array", () => {
    expect(graphOf(siteJsonLd())[0]).not.toHaveProperty("sameAs");
  });

  it("joins Cue by the same @id Cue-web publishes", () => {
    const org = graphOf(siteJsonLd())[0] as { subOrganization: Record<string, unknown> };
    expect(org.subOrganization["@id"]).toBe(CUE_ORG_ID);
  });

  it("defines Organization and WebSite once, on the homepage only", () => {
    expect(typesOf(siteJsonLd())).toEqual(["Organization", "WebSite", "WebPage"]);
    for (const graph of [portfolioJsonLd(), pageJsonLd({ path: "/contact", name: "C", description: "D" })]) {
      expect(typesOf(graph)).not.toContain("Organization");
      expect(typesOf(graph)).not.toContain("WebSite");
      expect(JSON.stringify(graph)).toContain(ORG_ID);
    }
  });
});

describe("page graphs", () => {
  it("gives every page a breadcrumb that starts at Home and ends at itself", () => {
    const graph = pageJsonLd({ path: "/legal/terms", name: "Terms of Use", description: "D" });
    const crumbs = graphOf(graph).find((n) => n["@type"] === "BreadcrumbList") as {
      itemListElement: { position: number; name: string; item: string }[];
    };
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Terms of Use",
        item: `${SITE_URL}/legal/terms`,
      },
    ]);
  });

  it("points the page node at its own breadcrumb and at the site entity", () => {
    const page = graphOf(pageJsonLd({ path: "/contact", name: "C", description: "D", type: "ContactPage" }))[0];
    expect(page["@type"]).toBe("ContactPage");
    expect(page.breadcrumb).toEqual({ "@id": `${SITE_URL}/contact#breadcrumb` });
    expect(page.about).toEqual({ "@id": ORG_ID });
  });

  it("lists Cue on the portfolio as a venture, by the shared @id", () => {
    const list = graphOf(portfolioJsonLd()).find((n) => n["@type"] === "ItemList") as {
      numberOfItems: number;
      itemListElement: { item: Record<string, unknown> }[];
    };
    expect(list.numberOfItems).toBe(1);
    expect(list.itemListElement[0].item["@id"]).toBe(CUE_ORG_ID);
  });
});

describe("copy rules hold in machine-readable text too", () => {
  const allText = [
    JSON.stringify(siteJsonLd()),
    JSON.stringify(portfolioJsonLd()),
    KEYWORDS.join(" "),
  ].join(" ");

  it("never describes the company with the word holding", () => {
    expect(allText.toLowerCase()).not.toContain("holding");
  });

  it("never frames the relationship to Cue as parent, above, or under", () => {
    expect(allText.toLowerCase()).not.toMatch(/\bparent\b|\babove\b|\bunder\b/);
  });

  it("uses no em-dashes", () => {
    expect(allText).not.toContain("—");
  });
});

describe("the route register", () => {
  it("keeps sitemap dates as fixed constants, not build time", () => {
    for (const page of PAGES) {
      expect(page.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("covers every indexable route exactly once", () => {
    const paths = PAGES.map((p) => p.path);
    expect(paths).toEqual(["", "/portfolio", "/contact", "/legal/privacy", "/legal/terms"]);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
