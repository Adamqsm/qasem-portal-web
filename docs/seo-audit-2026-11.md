# SEO and AI search audit: November 2026

Second pass, two months after go-live. Builds on
[seo-audit-2026-09.md](./seo-audit-2026-09.md); the recurring upkeep lives in
[seo-maintenance.md](./seo-maintenance.md). Brief from Adam, 4 Nov 2026:
Dubai-first for brand and company searches, keep the worldwide investor
reach, and make sure AI answer engines find and correctly describe the
company.

## 1. What changed outside the site since September

Primary sources only. This session could not open developers.google.com or
status.search.google.com directly (network policy), so the Google items were
read from search extracts of those official pages and should be clicked once
before anyone relies on the exact wording.

| Change | Date | Source | What it means here |
|---|---|---|---|
| August 2026 spam update | 18 to 21 Aug 2026 | [Search Status Dashboard](https://status.search.google.com/incidents/LEubPCm2octf2uMqCFKE) | None. No core update ran between August and today; the 2026 core updates were March and May. |
| September 2026 spam update | 24 Sep to 8 Oct 2026 | [Search Status Dashboard](https://status.search.google.com/incidents/XhUDXP7A67iHCD2kmbVu) | None. |
| FAQ rich result retired entirely | stopped showing 7 May 2026, docs removed June 2026 | [Search Central updates](https://developers.google.com/search/updates) | No FAQ markup on this site, and none added. |
| Generative AI performance report in Search Console, all sites | 31 Aug 2026 | [Help](https://support.google.com/webmasters/answer/16984139), [blog](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports) | New monthly step: read it alongside Performance. |
| Search generative AI control (opt out of AI Overviews and AI Mode), all sites | 31 Aug 2026 | [Help](https://support.google.com/webmasters/answer/16908024) | Leave it on (opted in). Opting out removes the site from AI answers and gains nothing. |
| Google: llms.txt is not used by Search; harmless to keep for others | note added 15 Jun 2026 | [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) | llms.txt added as a low-cost extra for other engines, with no Google expectation. |
| Bing: separate AI training and AI grounding preferences; shared `__usage_ai-training` robots token | announced 30 Oct 2026, honoured from 1 Feb 2027 | [Bing blog](https://blogs.bing.com/search/2026/10/your-content-your-choice-clearer-preferences-for-training-and-grounding/), [Bing help](https://www.bing.com/webmasters/help/new-ai-preferences-2t1cc16d) | Both default to allow, which is what we want. No change; revisit before February. |
| Bing Webmaster Tools AI Performance report (Copilot citations) | preview Feb 2026, Topics added 13 Oct 2026 | [Bing blog](https://blogs.bing.com/webmaster/2026/10/introducing-topics-portfolio-beta-in-ai-performance/) | Add the site to Bing Webmaster Tools; read this monthly. |
| AI crawlers now split training, search and user fetch | ongoing | [OpenAI](https://developers.openai.com/api/docs/bots), [Anthropic](https://support.claude.com/en/articles/8896518), [Perplexity](https://docs.perplexity.ai/docs/resources/perplexity-crawlers), [Google](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) | robots.txt keeps one `*` group, so every search, training and user agent is allowed. |
| IndexNow (Bing, Yandex, Naver, Seznam, Yep; not Google) | protocol unchanged | [indexnow.org](https://www.indexnow.org/documentation) | Wired in this pass. |

## 2. Where the site stands (4 Nov 2026)

| Check | Result |
|---|---|
| Rendering | Every page statically prerendered; content in the HTML. |
| robots.txt | Allows all; disallows `/api/` and now `/admin/`. |
| Sitemap | 6 URLs, hand-kept `lastmod`. Home, portfolio and contact bumped to 2026-11-04 in this pass. |
| Canonicals | Self-referential, www host. |
| hreflang | Absent by design (English only). |
| Titles and descriptions | All unique and in length. Home title had no "Dubai"; fixed. |
| Headings | One h1 per page; logical h2s. |
| Structured data | Organization + WebSite on home, page node + BreadcrumbList everywhere, ItemList on portfolio. Parses; `@id`s resolve. Gaps fixed: `sameAs` (was empty), `founder`. |
| OG cards | Per-route 1200x630 cards on all pages. |
| 404 | Real 404 status, `noindex`, own title, site chrome. |
| Image alt text | Every content image has alt text; paired dark-mode copies are `alt=""` and `aria-hidden`, correctly. |
| Lighthouse mobile (local production build, median of 3) | Home 96, Portfolio 98, Contact 99, Careers 99 before; 97, 98, 97, 99 after. Accessibility, Best Practices and SEO 100 on every page, before and after. |
| Live site | Not re-measured from here: this session's network policy blocks www.qasem-portal.com. Search Console, PageSpeed on the live URL and the live HTML check are in the off-site steps. |

**Brand search, measured with this session's web search (not Google, which
is blocked here):** "Qasem Portal", "Qasem Portal Dubai technology company"
and the bare domain all return unrelated Qasem people and places, Qatar and
Qassim government portals. The site does not appear at all. That index is the
kind AI assistants search through, so it is the clearest evidence for this
pass's priorities: get the site into Bing's index (Bing Webmaster Tools plus
IndexNow) and give every engine one plain statement to quote.

## 3. What this pass changes

1. **Dubai-first metadata.** Home title "Qasem Portal · Technology company
   registered in Dubai, UAE"; home description leads with the Dubai
   registration and names Cue; contact description names it too. Still
   stated, not targeted: no `LocalBusiness`, no geo, no service area, no
   Business Profile (section 4).
2. **"Qasem Portal in brief" on the homepage.** One server-rendered
   statement (what it is, where, founder, the venture) and a short register
   of the same facts. It is what an assistant should quote, and the schema
   repeats exactly it.
3. **Schema.** `sameAs` now carries the company LinkedIn page; `founder`
   names Adam Qasem as a `Person`; `foundingDate` is "2026" (year only, by
   Adam's decision; it matches the LinkedIn page). `disambiguatingDescription`
   names the founder and the year and drops "first venture". No
   `legalName`, street address or phone: held for counsel or by Adam's rule.
4. **Copy rule.** "Cue is its first venture" in metadata and schema became
   "the company behind Cue" / "its venture is Cue", so nothing implies a
   wider portfolio. Cue is described as "from Amman, Jordan", matching
   cue-app.net. On Adam's decisions of 4 Nov: the portfolio's "Further
   ventures will be listed here" note and its "Working on something that
   belongs here?" call-out are gone; the Cue card's status reads
   "Pre-launch, Amman" (no venue is onboarded yet), and the homepage hero no
   longer calls Cue "in operation".
5. **llms.txt** at the root: the same facts and links, in the llmstxt.org
   shape.
6. **IndexNow**: key file at the root, `scripts/indexnow.mjs`
   (`npm run indexnow`), and `.github/workflows/indexnow.yml`, which runs
   after every successful production deployment Vercel reports to GitHub
   and can be run by hand from the Actions tab.
7. **robots.txt** also disallows `/admin/`, matching cue-app.net.
8. **Tests** pin all of it: the brief block is in the server HTML and shows
   every fact the schema asserts, the brief states no date but the founding
   year and no street address, Cue reads "Pre-launch" and never "in
   operation", the portfolio announces no further ventures, `sameAs` holds
   only the verified profile, llms.txt links only to
   this site, Cue and verified profiles, and there is exactly one valid
   IndexNow key file.

## 4. Decisions recorded

- **No Google Business Profile.** Google's guidelines require in-person
  contact with customers at the listed address during stated hours. A
  registered office that does not receive visitors does not qualify, and a
  profile created anyway risks suspension. Reopen only if the Dubai office
  starts receiving visitors.
- **Dubai in the title, not in markup.** The brand query "Qasem Portal
  Dubai" is now matched in the title and the first line of the description.
  Investors elsewhere still match on the brand alone; nothing narrows the
  entity to a locality.
- **Founding year 2026, year only** (Adam, 4 Nov 2026), in the brief block,
  llms.txt and `foundingDate` together.
- **Cue's status is "Pre-launch, Amman"** everywhere this site states it,
  until a venue is live.
- **No wider portfolio implied.** Lines that announced or invited further
  ventures were removed from the portfolio page. Remaining forward-looking
  lines on the homepage ("structured to house multiple ventures", "Cue, the
  first", the Goals row) were left as they are: not part of the decision.

## 5. Verification

- `npx vitest run`: 91 tests, green.
- `npx tsc --noEmit`: clean. `npm run lint`: clean.
- `node scripts/copy-guard.mjs`: clean.
- `npm run build`: clean; prerendered HTML read back for titles,
  descriptions, robots.txt, llms.txt, the key file and the JSON-LD graph.
- `scripts/indexnow.mjs`: the live sitemap and api.indexnow.org are both
  out of reach from this session, so the first real submission is the
  Action's first run after deploy. Exercised here: key discovery, the
  `--dry-run` payload against the local build, and the refusal of URLs on
  another host.
