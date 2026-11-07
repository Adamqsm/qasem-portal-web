import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/page";
import PortfolioPage from "@/app/portfolio/page";
import { siteJsonLd } from "@/lib/seo";
import { FOUNDER, FOUNDING_YEAR, SAME_AS, SITE_URL } from "@/lib/site";

const publicDir = join(process.cwd(), "public");

/** The homepage as a crawler receives it: server-rendered HTML, no JavaScript. */
const textOf = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'");
const text = textOf(renderToStaticMarkup(createElement(Home)));
const portfolioText = textOf(renderToStaticMarkup(createElement(PortfolioPage)));

describe("the 'Qasem Portal in brief' block", () => {
  it("is in the server-rendered homepage, as one quotable statement", () => {
    expect(text).toContain("Qasem Portal in brief.");
    expect(text).toContain(
      `Qasem Portal is a technology company registered in Dubai, United Arab Emirates, and founded by ${FOUNDER} in ${FOUNDING_YEAR}.`
    );
  });

  it("shows every fact the Organization schema asserts beyond name and URL", () => {
    const org = (siteJsonLd() as { "@graph": Record<string, unknown>[] })["@graph"][0];
    expect(org.foundingDate).toBe(FOUNDING_YEAR);
    expect(text).toContain(`Founded${FOUNDING_YEAR}`);
    expect(org.founder).toMatchObject({ name: FOUNDER });
    expect(text).toContain(FOUNDER);
    expect(org.address).toMatchObject({ addressLocality: "Dubai", addressCountry: "AE" });
    expect(text).toContain("Dubai, United Arab Emirates");
    expect(text).toContain("Cue, a restaurant reservation and venue booking app from Amman, Jordan");
  });

  it("states no date, figure or address beyond the confirmed founding year", () => {
    const brief = text.slice(text.indexOf("Qasem Portal in brief."));
    const years = brief.match(/\b(19|20)\d{2}\b/g) ?? [];
    expect(new Set(years)).toEqual(new Set([FOUNDING_YEAR]));
    expect(brief).not.toMatch(/Office|Al Qusais|\+971/);
  });
});

describe("Cue's status and the single-venture copy", () => {
  it("shows Cue as pre-launch, never as in operation", () => {
    for (const page of [text, portfolioText]) {
      expect(page).toContain("Pre-launch, Amman");
      expect(page).not.toMatch(/in operation/i);
    }
  });

  it("does not invite or announce further ventures on the portfolio", () => {
    expect(portfolioText).not.toMatch(/further ventures|belongs here/i);
  });

  it("names Cue as the venture in the hero, with no 'first' or 'multiple ventures'", () => {
    expect(text).toContain(
      "Its venture is Cue, a restaurant reservation and venue booking app in pre-launch in Amman, Jordan."
    );
    expect(text).not.toMatch(/multiple ventures|Cue, the first/);
  });
});

describe("llms.txt", () => {
  const llms = readFileSync(join(publicDir, "llms.txt"), "utf8");

  it("follows the llms.txt shape: one H1, then a blockquote summary", () => {
    const lines = llms.split("\n");
    expect(lines[0]).toBe("# Qasem Portal");
    expect(llms.match(/^# /gm)).toHaveLength(1);
    expect(lines.find((l) => l.startsWith(">"))).toMatch(/^> Qasem Portal is a technology company/);
  });

  it("links only to live pages of this site and to verified profiles", () => {
    const urls = [...llms.matchAll(/https:\/\/[^\s)]+/g)].map((m) => m[0]);
    for (const url of urls) {
      const ok =
        url.startsWith(`${SITE_URL}/`) ||
        url === "https://www.cue-app.net" ||
        SAME_AS.includes(url);
      expect(ok, url).toBe(true);
    }
  });

  it("repeats the founder and registration the homepage states", () => {
    expect(llms).toContain(`Founder: ${FOUNDER}`);
    expect(llms).toContain(`Founded: ${FOUNDING_YEAR}`);
    expect(llms).toContain("Registered in: Dubai, United Arab Emirates");
  });
});

describe("IndexNow key", () => {
  it("is exactly one public/<32 hex>.txt file whose body is its own key", () => {
    const files = readdirSync(publicDir).filter((f) => /^[a-f0-9]{32}\.txt$/.test(f));
    expect(files).toHaveLength(1);
    const key = files[0].slice(0, -4);
    expect(readFileSync(join(publicDir, files[0]), "utf8")).toBe(key);
  });
});
