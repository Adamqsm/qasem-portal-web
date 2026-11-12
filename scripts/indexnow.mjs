#!/usr/bin/env node
/**
 * IndexNow: tell Bing (and Yandex, Naver, Seznam and Yep, which share the
 * protocol) that pages changed, so they recrawl now instead of whenever they
 * next pass by. Bing's index also feeds Copilot and other AI answer engines.
 * Google does not take part; Search Console stays the route for Google.
 *
 * Usage (from the repo root, after a production deploy is live):
 *   node scripts/indexnow.mjs                  every URL in the live sitemap
 *   node scripts/indexnow.mjs <url> [<url>...] only these URLs
 *   node scripts/indexnow.mjs --dry-run        print what would be sent
 *   node scripts/indexnow.mjs --soft           never exit non-zero (the deploy Action)
 *
 * Order of work: prove the key file is live, read the live sitemap, POST
 * {host, key, keyLocation, urlList} to api.indexnow.org.
 *
 * - Key file not live yet (first deploy still propagating, or a deploy that
 *   does not carry it): skip quietly with exit 0, whatever the mode.
 * - Any other failure (sitemap unreachable, IndexNow refusing): exit 1 when
 *   run by hand, so the person sees it; with --soft, a warning and exit 0,
 *   so the Action never goes red and never touches the deploy.
 *
 * The key is the name of the one `public/<32 hex>.txt` file, whose body is
 * the key itself; that file is the single source of truth. The key is public
 * by design (IndexNow fetches it from the site root), so it is not a secret.
 *
 * Protocol: https://www.indexnow.org/documentation
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SITE = (process.env.INDEXNOW_SITE ?? "https://www.qasem-portal.com").replace(/\/$/, "");
const ENDPOINT = "https://api.indexnow.org/indexnow";
const TIMEOUT_MS = 15_000;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const soft = args.includes("--soft");
const explicit = args.filter((a) => !a.startsWith("--"));

// GitHub Actions renders these prefixes as annotations; elsewhere they read as plain text.
const notice = (msg) => console.log(`::notice title=IndexNow::${msg}`);
const warn = (msg) => console.log(`::warning title=IndexNow::${msg}`);

class Skip extends Error {}

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

async function get(url) {
  return fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow" });
}

async function keyIsLive(keyLocation, key) {
  try {
    const res = await get(keyLocation);
    return res.ok && (await res.text()).trim() === key;
  } catch {
    return false;
  }
}

async function sitemapUrls() {
  const res = await get(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  const key = readKey();
  const keyLocation = `${SITE}/${key}.txt`;
  const host = new URL(SITE).host;

  if (!dryRun && !(await keyIsLive(keyLocation, key))) {
    throw new Skip(`${keyLocation} is not live yet; nothing submitted.`);
  }

  const urlList = explicit.length > 0 ? explicit : await sitemapUrls();
  const foreign = urlList.filter((u) => new URL(u).host !== host);
  if (foreign.length > 0) throw new Error(`URLs outside ${host}: ${foreign.join(", ")}`);
  if (urlList.length === 0) throw new Error("no URLs to submit");

  const body = { host, key, keyLocation, urlList };
  if (dryRun) {
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // 200 OK and 202 Accepted are both success; 202 means the key is still being checked.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`api.indexnow.org answered HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  console.log(`IndexNow: HTTP ${res.status}, ${urlList.length} URL(s) submitted for ${host}`);
}

main().catch((err) => {
  if (err instanceof Skip) {
    notice(err.message);
    return;
  }
  if (soft) {
    warn(err.message);
    return;
  }
  console.error(`indexnow: ${err.message}`);
  process.exitCode = 1;
});
