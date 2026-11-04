import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/page";
import { siteJsonLd } from "@/lib/seo";
import { FOUNDER, SAME_AS, SITE_URL } from "@/lib/site";

const publicDir = join(process.cwd(), "public");

/** The homepage as a crawler receives it: server-rendered HTML, no JavaScript. */
const html = renderToStaticMarkup(createElement(Home));
const text = html.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'");

describe("the 'Qasem Portal in brief' block", () => {
  it("is in the server-rendered homepage, as one quotable statement", () => {
    expect(text).toContain("Qasem Portal in brief.");
    expect(text).toContain(
      `Qasem Portal is a technology company registered in Dubai, United Arab Emirates, and founded by ${FOUNDER}.`
    );
  });

  it("shows every fact the Organization schema asserts beyond name and URL", () => {
    const org = (siteJsonLd() as { "@graph": Record<string, unknown>[] })["@graph"][0];
    expect(org.founder).toMatchObject({ name: FOUNDER });
    expect(text).toContain(FOUNDER);
    expect(org.address).toMatchObject({ addressLocality: "Dubai", addressCountry: "AE" });
    expect(text).toContain("Dubai, United Arab Emirates");
    expect(text).toContain("Cue, a restaurant reservation and venue booking app from Amman, Jordan");
  });

  it("states no date, figure or address the site does not already state", () => {
    const brief = text.slice(text.indexOf("Qasem Portal in brief."));
    expect(brief).not.toMatch(/\b(19|20)\d{2}\b/);
    expect(brief).not.toMatch(/Office|Al Qusais|\+971/);
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
