import type { MetadataRoute } from "next";
import { PAGES, SITE_URL } from "@/lib/site";

/**
 * The sitemap is generated from the route register in `src/lib/site.ts`, so
 * a new page cannot ship with a breadcrumb label but no sitemap entry.
 *
 * `lastModified` comes from that register rather than from build time: a date
 * that moves on every deploy teaches a crawler that the dates carry no
 * information, which is worse than omitting them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: new Date(`${page.lastModified}T00:00:00Z`),
    changeFrequency: page.changeFrequency,
    priority: page.path === "" ? 1 : 0.6,
  }));
}
