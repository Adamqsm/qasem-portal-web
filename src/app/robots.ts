import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Every crawler is welcome, search and AI alike (Googlebot, Bingbot,
 * OAI-SearchBot, GPTBot, Claude-SearchBot, ClaudeBot, PerplexityBot and the
 * rest): one `*` group, no per-bot rules. A company with no press coverage
 * needs to be read, not hidden. Only the form endpoints and any future admin
 * surface are kept out. `/admin/` has no route today; it is listed so the
 * rule matches cue-app.net's and holds if one is ever added.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
