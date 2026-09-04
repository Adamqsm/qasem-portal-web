# SEO audit — September 2026 (baseline)

The state of qasem-portal.com two days after go-live, what was fixed in the
same pass, and what was deliberately left alone. The recurring upkeep this
sets up lives in [seo-maintenance.md](./seo-maintenance.md).

## 1. Where the site actually stands

The honest baseline is that there is nothing to measure yet. The site went
live on 2026-09-02 and the sitemap was submitted on 2026-09-04.

| Measure | Reading on 2026-09-04 |
|---|---|
| Search Console (`sc-domain:qasem-portal.com`) | Verified. Performance, Indexing, Experience and Enhancements all report "Processing data, please check again in a day or so". |
| Sitemap | Submitted and read 2026-09-04. Status Success, 5 pages discovered. |
| Pages indexed (`site:qasem-portal.com`) | **0.** Normal for a two-day-old domain; not a fault to chase. |
| External links | **0.** Nothing anywhere links to the site. |
| Brand SERP for "Qasem Portal" | The name returns unrelated people and companies that share the Qasem surname. The site does not appear. |

Two consequences follow, and they shape everything else in this document.

First, every number in the maintenance log starts at zero, so the first two
or three monthly runs are about confirming that indexing happens at all, not
about ranking movement.

Second, the competition for the brand name is not another business with the
same offer; it is name collision. "Qasem" is a common surname, and the
results that currently occupy the query are individuals' profiles and
unrelated firms. That is the problem the schema work below is aimed at.

## 2. What was already correct

The site shipped in good shape, so the audit found no infrastructure faults.
Recorded here so a future pass does not re-derive it:

- **Canonicals.** Every page carries a self-referential canonical on the www
  host. `http://qasem-portal.com` and `https://qasem-portal.com` both 308 to
  `https://www.qasem-portal.com`, so there is one origin and no split.
- **Open Graph and Twitter.** Complete on all five pages: title, description,
  URL, site name, locale, type, and a per-route 1200x630 card with alt text,
  dimensions and MIME type, plus `summary_large_image` on the Twitter side.
  Nothing was missing.
- **robots.txt** allows everything except `/api/` and names the sitemap.
- **hreflang.** Absent, and correctly so. The site is English only. There is
  no `alternates.languages`, no self-referential hreflang, and no invented
  second locale. A wrong hreflang pair is an active hazard, not a neutral
  one, so this is a deliberate absence rather than an oversight, and it is now
  asserted by a test.
- **Titles.** The `%s · Qasem Portal` template applies correctly to child
  routes and does not double-apply on the homepage.
- **Rendering.** Every page is statically prerendered with its content in the
  HTML. Nothing depends on client JavaScript to be crawlable.

## 3. What was fixed

### Schema, from one node to a graph

Before this pass, JSON-LD existed on the homepage only: an `Organization`
plus a `WebSite`. The other four pages carried none.

- `Organization` gained `disambiguatingDescription`, `knowsAbout`,
  `foundingLocation` and a `contactPoint`. The disambiguation field is the
  one that matters most: it is the field schema.org provides for exactly the
  name-collision problem in section 1.
- Every page now emits a graph of its own: a page node typed `WebPage`,
  `ContactPage` or `CollectionPage`, and a `BreadcrumbList`. The
  `Organization` and `WebSite` nodes stay defined once, on the homepage, and
  every other page cites them by `@id`, so the graph resolves to one entity
  rather than five near-copies.
- The portfolio marks its venture register as an `ItemList` whose single
  entry is Cue, carried at the same `@id` that Cue-web publishes. Cue's
  identity is now asserted twice from this site, consistently, on the two
  pages a crawler reads first.

`Organization`, never `LocalBusiness`. See section 4.

### Metadata

- **Homepage title** was the bare word mark. A brand nobody has met gives a
  search result nothing to match on and a reader nothing to read, so it now
  carries the company's own description of itself after the name.
- **Homepage description** now names Cue. The likeliest route to this page is
  someone who met Cue first and wants to know what company stands behind it;
  a snippet that answers that in the result earns the click.
- **Portfolio description** said "platform"; the site's own copy says "app".
  Now matched.
- **Contact description** was five words. It now states the two paths, in the
  page's own words.
- **Keywords** added, as a small honest set rather than a stuffed list.
- **404** had the bare brand title, shared with the homepage. It now says so.

### Sitemap

Entries gained `lastModified`, taken from a hand-kept route register in
`src/lib/site.ts` rather than from build time. A date that moves on every
deploy teaches a crawler that the dates carry no information. `changefreq`
was tuned so the legal pages no longer claim to change monthly.

### Tests

`src/lib/__tests__/seo.test.ts` covers the above and, more usefully, pins the
decisions: that the graph is never a `LocalBusiness`, that no geo coordinate
or service area appears anywhere, that no fact the site does not state is
asserted, that `sameAs` is omitted rather than emitted empty, that hreflang
stays absent, and that the copy rules hold in machine-readable text too.

## 4. Two decisions worth writing down

### The audience is worldwide, so the geo signals stay off

Cue's SEO work is built around Amman: geo coordinates, neighbourhood
targeting, a Google Business Profile, Jordan-shaped keywords. **None of that
transfers to this site, and copying it would be an active mistake.**

Qasem Portal has no premises to visit, no opening hours, no walk-in trade and
no service area. The reader worth catching is an investor or a counterparty
who could be anywhere, and the query they type has no place name in it. So:

- `Organization`, not `LocalBusiness`, and none of its local subtypes.
- No `geo`, no `GeoCoordinates`, no `areaServed`, no `openingHours`.
- No Google Business Profile, and no locality in any keyword.
- No country-shaped meta or hreflang.

The Dubai registration stays. It is true, it is a load-bearing fact for a
company asking to be taken seriously, and it appears in the copy, the footer,
both legal pages, and the schema's `address` and `foundingLocation`. The
distinction is that it is **stated, not targeted**. Nothing in the site tries
to rank for anything Dubai-shaped.

Amman likewise appears only where it is a fact about Cue, not a target for
this site.

### Entity resolution first, category terms second

This is a five-page corporate register with no content depth and no
backlinks. It cannot win contested category head terms, and pretending
otherwise would produce a strategy that reads well and does nothing.

What it can own outright, and soon, is its own entity. It is the only
authoritative source for what Qasem Portal is, and the only page on the web
that joins Cue to the company behind it. Those are the searches an investor
or a business-development contact actually runs, and they are winnable
because nobody else is competing for them. Category vocabulary
(venture building, hospitality technology, app-driven ventures) rides along
as support, in `knowsAbout` and in the keyword set, but it is not the target.

Two words never appear, in copy or in metadata: the company is not described
with the word "holding", and its relationship to Cue is never framed as
"parent", "above" or "under". The keyword "company behind Cue" catches the
same search intent without adopting the framing. A test enforces this.

## 5. Left for Adam

Neither of these is a code change.

1. **`sameAs` is empty.** It is the strongest entity-resolution signal
   available to a site with no press coverage, and the obvious first entry is
   a Qasem Portal company page on LinkedIn. No such page exists today. The
   constant is in `src/lib/site.ts` with a comment; one line, the day the
   page is real. A wrong or borrowed URL there is worse than none.
2. **Backlinks are zero and cannot be manufactured.** The one legitimate,
   high-value link available is reciprocal: Cue-web citing Qasem Portal as
   the company behind it, with Cue's own `Organization` node carrying a
   matching `parentOrganization` pointer back to this site's `@id`. That is a
   change in the Cue-web repo and a real editorial decision about Cue's copy,
   so it is not made here. Beyond that: any directory, press mention or
   partner page is a relationship, not a task.

## 6. Verification performed

- `npm test` — 67 tests across 8 files, green.
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npm run build` — clean, all five pages statically prerendered.
- Prerendered HTML read directly from `.next/server/app/` to confirm the
  emitted titles, descriptions, keywords, canonicals, sitemap XML and each
  page's JSON-LD graph, rather than inferring them from the source.
