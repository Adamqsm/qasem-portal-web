import { describe, expect, it } from "vitest";
import {
  CAREERS_CLOSING,
  CAREERS_DESCRIPTION,
  CAREERS_PATH,
  CAREERS_SUBHEAD,
  CAREERS_TITLE,
  COMMITMENTS,
} from "@/lib/careers";
import { pageJsonLd } from "@/lib/seo";
import { NAV_ITEMS, PAGES } from "@/lib/site";

/** Every string a reader can see on the page, in reading order. */
const READING_COPY = [
  CAREERS_TITLE,
  CAREERS_SUBHEAD,
  CAREERS_DESCRIPTION,
  ...COMMITMENTS.flatMap((part) => [part.label, part.heading, part.body]),
  CAREERS_CLOSING,
];

/** The reading copy plus the machine-readable graph a crawler sees. */
const ALL_TEXT = [
  ...READING_COPY,
  JSON.stringify(
    pageJsonLd({ path: CAREERS_PATH, name: CAREERS_TITLE, description: CAREERS_DESCRIPTION })
  ),
].join(" ");

describe("the career growth and learning copy", () => {
  it("states exactly three commitments, in the order they were given", () => {
    expect(COMMITMENTS.map((part) => part.heading)).toEqual([
      "Professional development.",
      "Mentorship.",
      "Applied experience.",
    ]);
  });

  it("keeps the substance of each commitment", () => {
    const [development, mentorship, applied] = COMMITMENTS.map((part) => part.body);
    expect(development).toContain("courses delivered through Coursera");
    expect(development).toContain("reviewed periodically");
    expect(mentorship).toContain("paired with a mentor");
    expect(mentorship).toContain("throughout their tenure");
    expect(applied).toContain("live projects and ventures");
    expect(applied).toContain("hands-on capability");
    expect(CAREERS_CLOSING).toBe(
      "We view the growth of our people as inseparable from the growth of the organization itself."
    );
  });

  it("claims no number: no statistic, count, percentage, date or outcome figure", () => {
    for (const text of READING_COPY) {
      expect(text).not.toMatch(/\d|%/);
    }
  });

  it("holds the site's copy rules in every string, graph included", () => {
    expect(ALL_TEXT).not.toContain("—");
    expect(ALL_TEXT.toLowerCase()).not.toContain("holding");
    expect(ALL_TEXT.toLowerCase()).not.toMatch(
      /\bparent\b|\babove\b|\bunder\b|\bumbrella\b/
    );
  });

  it("stays inside its own subject: no sustainability, social impact or generic values copy", () => {
    expect(ALL_TEXT.toLowerCase()).not.toMatch(
      /sustainab|environment|climate|social impact|diversity|our values/
    );
  });

  it("is registered as a route and as a primary navigation item", () => {
    expect(PAGES.map((page) => page.path)).toContain(CAREERS_PATH);
    expect(NAV_ITEMS.map((item) => item.href)).toContain(CAREERS_PATH);
  });

  it("emits a plain WebPage graph about the organization, asserting nothing else", () => {
    const graph = pageJsonLd({
      path: CAREERS_PATH,
      name: CAREERS_TITLE,
      description: CAREERS_DESCRIPTION,
    })["@graph"];
    expect(graph.map((node) => node["@type"])).toEqual(["WebPage", "BreadcrumbList"]);
    expect(graph[0]).toMatchObject({ "@type": "WebPage", name: CAREERS_TITLE });
  });
});
