# SEO Maintenance — Recurring Cadence

Repeatable upkeep so visibility compounds without re-auditing from scratch.
The baseline, and the reasoning behind the decisions this doc assumes, live in
[seo-audit-2026-09.md](./seo-audit-2026-09.md). Update the log at the bottom
each run.

**The one rule to keep in mind while doing any of this:** this site is not geo
targeted. Qasem Portal has no premises, no service area and no local trade;
the reader worth catching is an investor or a counterparty who could be
anywhere. If a step below ever tempts you toward a Google Business Profile, a
`LocalBusiness` type, a geo coordinate or a place name in a keyword, the
answer is no. See "If the company changes shape" at the bottom for the one
circumstance that would reopen it.

## Monthly check (~30 min, first Monday)

All Search Console reports: property `sc-domain:qasem-portal.com` at
[search.google.com/search-console](https://search.google.com/search-console).

1. **Performance → last 3 months.** Record clicks / impressions / avg
   position. Then read **Queries** with the entity-first strategy in mind:

   - Queries containing "Qasem Portal" are the ones that must work. If they
     show impressions but a poor average position, the brand SERP is losing
     to the surname collision described in the audit, and the fix is
     entity signal (a real `sameAs` entry, a citation from Cue-web), not
     more keywords.
   - Any query joining Cue to the company ("cue app company", "company
     behind cue", "who makes cue") is the strategy working. Note it and
     check which page received it; if it landed on the homepage rather than
     the portfolio, consider whether the portfolio needs the stronger
     internal link.
   - Category queries (venture building, hospitality technology) are a bonus,
     not the target. Do not restructure the site to chase them.

   Read **Countries** for information, not as a target. Impressions from
   anywhere are legitimate here. A concentration in one country is not a
   signal to act on, and a spread across many is the intended outcome.

2. **Indexing → Pages.** Indexed count against an expected **5** (update the
   expectation when routes ship). `/_not-found` and `/api/*` should never
   appear as indexed; if one does, something regressed. A real content URL
   sitting in "Crawled – currently not indexed" or "Discovered – currently
   not indexed" for two consecutive months is worth acting on: the usual
   causes on a site this small are thin content and zero inbound links, so
   the fix is a fresh internal link plus Request Indexing, and if that fails
   twice, the page needs more substance rather than more requests.

3. **Links report.** External links total. It is 0 as of 2026-09. Any new
   linking site is worth recording below. Do not buy, swap or solicit links;
   the only ones that help a company page like this are ones somebody chose
   to give.

4. **PageSpeed** — [pagespeed.web.dev](https://pagespeed.web.dev) on `/` and
   `/portfolio`, mobile. Every page is statically prerendered, so a
   regression here almost always means a new dependency or an unoptimised
   image rather than a rendering change. If CrUX field data ever appears
   (it needs real traffic), switch attention from lab to field numbers; field
   LCP above 2.5 s is worth acting on, lab numbers on a static site rarely
   are.

5. **Brand SERP spot-check.** Search `Qasem Portal` and `qasem portal dubai`,
   and separately `cue app company`. Questions to answer:

   - Does qasem-portal.com hold position 1 for its own name yet?
   - Is a knowledge panel forming, and if so does it carry the right
     description, or has it merged the company with one of the unrelated
     Qasem entities?
   - For `cue app company`, does anything from either site surface?

   Ignore unrelated people and firms sharing the Qasem surname, and the
   Qasemi Group. Those are known homonyms, not competitors, and they are the
   reason `disambiguatingDescription` exists in the schema.

6. **Metadata hygiene** — any page shipped since the last check must have:
   `buildMetadata` with its own title and description, an entry in the
   `PAGES` register in `src/lib/site.ts` (which is what puts it in the
   sitemap and gives its breadcrumb a label), a JSON-LD graph via
   `pageJsonLd`, and an `opengraph-image.tsx`. Bump the page's
   `lastModified` when its content actually changes, and leave it alone when
   it does not.

7. **Rich Results.** Run the homepage and `/portfolio` through
   [Google's Rich Results Test](https://search.google.com/test/rich-results)
   and the [Schema Markup Validator](https://validator.schema.org). Neither
   page is expected to earn a rich result; the point is that the graph parses
   and the `@id` references resolve. Watch specifically that Cue's
   `@id` (`https://www.cue-app.net/#organization`) still matches what
   Cue-web emits. If Cue-web ever changes its origin or node id, the join
   between the two graphs breaks silently and nothing in either repo's tests
   would catch it.

## Quarterly (with a monthly run)

- Re-read the **keyword set** (`KEYWORDS` in `src/lib/site.ts`) against what
  GSC Queries actually shows. Terms drawing zero impressions after two
  quarters are aspiration, not strategy; cut them. Terms appearing in GSC
  that are not in the set are evidence; add them.
- Re-read the **descriptions** as a stranger would. The homepage description
  is the one doing the work, and the test of it is whether someone who has
  only heard of Cue would understand from the snippet alone what this
  company is.
- **Check `sameAs`.** Still the highest-value open item. If a company
  LinkedIn page (or any other profile the company genuinely controls) now
  exists, add it and re-run the Rich Results test.
- **Check the Cue-web side of the join.** Cue's `Organization` node citing
  Qasem Portal back, via `parentOrganization` pointing at
  `https://www.qasem-portal.com/#organization`, would make the relationship
  bidirectional and is the single strongest remaining structural gain. It is
  a change in the Cue-web repo and an editorial decision about Cue's own
  copy, so it needs Adam, not a code change here.
- Re-read this doc; prune steps that stopped earning their time.

## Event-driven triggers (do when the event happens, not on schedule)

| Trigger | Action |
|---|---|
| **A real company profile exists** (LinkedIn, Crunchbase, a registry listing) | Add the URL to `SAME_AS` in `src/lib/site.ts`. One line, and the strongest entity signal available to this site. Re-run the Rich Results test after deploy. |
| **A second venture is established** | Add it to the portfolio's `ItemList` in `portfolioJsonLd`, with its own canonical `@id` matching whatever that venture's own site publishes, and to the `subOrganization` set on the Organization node (which becomes an array). Revisit the homepage copy, which currently states there is one venture. Also reconsider geo schema at this point, but only per the note below. |
| **A press mention or third-party write-up appears** | Record it in the run log. If the piece is substantive and the publisher is credible, it is also a candidate for `Organization.subjectOf`. |
| **The company publishes anything with a date** (an announcement, a report, a note) | That is the first content this site would have. It needs its own route, `Article` or `NewsArticle` schema with a real `datePublished`, an entry in `PAGES`, and an OG card. Do not retrofit dated schema onto the existing undated pages. |
| **A new route ships** | Metadata, `PAGES` entry, `pageJsonLd` graph, OG image. Checklist item 6 above. |
| **Cue-web changes origin or node id** | Update `CUE_URL` / `CUE_ORG_ID` in `src/lib/site.ts` the same day. The graph join is silent when it breaks. |
| **A second language is added** | `alternates.languages` and `openGraph.locale` in `buildMetadata` are the single place it goes, and the test asserting hreflang is absent has to be rewritten deliberately, not deleted. |

## If the company changes shape

The no-geo posture in this document is a judgment about what the company is
today, not a permanent rule. Two events would justify reopening it, and only
these two:

- **A physical office presence that receives visitors.** Not a registered
  address, which already exists and correctly stays off the geo signals, but
  an actual place a counterparty would travel to. That would make
  `LocalBusiness`-adjacent markup and a Google Business Profile defensible.
- **A second venture with its own local market.** If the portfolio grows into
  ventures whose own audiences are geographically bounded, the right answer
  is still almost certainly geo schema on *those ventures' own sites*, the
  way Cue carries Amman on cue-app.net, and not on this one.

Until one of those happens, adding geo markup here would target searches
nobody runs, and would risk anchoring the company entity to a locality in a
way that narrows rather than widens who finds it.

## Automation note

The monthly check needs Search Console, which means the session must reach
Adam's signed-in Chrome or a GSC API token. Steps 1 to 3 become scriptable if
a GSC API service account is ever wired up, at which point the agent can file
the log entry itself. Until then it is a 30-minute manual pass with this page
open.

## Run log

| Date | Clicks/Impr (3mo) | Avg pos | Indexed | Ext. links | Notes |
|---|---|---|---|---|---|
| 2026-09-04 | 0 / 0 | n/a | **0** | **0** | Baseline, two days after go-live. GSC verified, all reports still "processing data". Sitemap submitted and read the same day: Success, 5 pages discovered. `site:` returns nothing. Brand SERP is occupied by unrelated people and firms sharing the Qasem surname. Full audit and the fixes shipped in this pass: [seo-audit-2026-09.md](./seo-audit-2026-09.md). |
