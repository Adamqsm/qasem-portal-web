#!/usr/bin/env node
/**
 * IndexNow: tell Bing (and Yandex, Naver, Seznam and Yep, which share the
 * protocol) that pages changed, so they recrawl now instead of whenever they
 * next pass by. Bing's index also feeds Copilot and other AI answer engines,
 * which makes this the cheapest way to get a deploy in front of them.
 * Google does not take part; Search Console stays the route for Google.
 *
 * Usage (from the repo root, after a production deploy is live):
 *   node scripts/indexnow.mjs                  every URL in the live sitemap
 *   node scripts/indexnow.mjs <url> [<url>...] only these URLs
 *   node scripts/indexnow.mjs --dry-run        print what would be sent
 *
 * The key is the name of the one `public/<32 hex>.txt` file, whose body is
 * the key itself; that file is the single source of truth, and IndexNow
 * fetches it from the live site to prove the submission is ours. The key is
 * public by design (it is served at the site root), so it is not a secret.
 *
 * Protocol: https://www.indexnow.org/documentation
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SITE = (process.env.INDEXNOW_SITE ?? "https://www.qasem-portal.com").replace(/\/$/, "");
const ENDPOINT = "https://api.indexnow.org/indexnow";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const explicit = args.filter((a) => !a.startsWith("--"));

function readKey() {
  const dir = join(process.cwd(), "public");
  const files = readdirSync(dir).filter((f) => /^[a-f0-9]{32}\.txt$/.test(f));
  if (files.length !== 1) {
    throw new Error(`expected exactly one IndexNow key file in public/, found ${files.length}`);
  }
  const key = files[0].slice(0, -4);
  if (readFileSync(join(dir, files[0]), "utf8").trim() !== key) {
    throw new Error(`public/${files[0]} must contain its own key and nothing else`);
  }
  return key;
}

async function sitemapUrls() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  const key = readKey();
  const keyLocation = `${SITE}/${key}.txt`;
  const urlList = explicit.length > 0 ? explicit : await sitemapUrls();
  const host = new URL(SITE).host;
  const foreign = urlList.filter((u) => new URL(u).host !== host);
  if (foreign.length > 0) throw new Error(`URLs outside ${host}: ${foreign.join(", ")}`);
  if (urlList.length === 0) throw new Error("no URLs to submit");

  const body = { host, key, keyLocation, urlList };
  if (dryRun) {
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  // Fail early, with a clear message, if the deploy does not serve the key yet.
  const served = await fetch(keyLocation);
  if (!served.ok || (await served.text()).trim() !== key) {
    throw new Error(`${keyLocation} is not serving the key (HTTP ${served.status}); is the deploy live?`);
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  // 200 OK and 202 Accepted are both success; 202 means the key is still being checked.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow answered HTTP ${res.status}: ${await res.text()}`);
  }
  console.log(`IndexNow: HTTP ${res.status}, ${urlList.length} URL(s) submitted for ${host}`);
}

main().catch((err) => {
  console.error(`indexnow: ${err.message}`);
  process.exit(1);
});
