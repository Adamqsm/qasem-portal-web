import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, siteJsonLd } from "@/lib/seo";
import { withUtm } from "@/lib/utm";
import JsonLd from "@/components/JsonLd";
import CueCard from "@/components/CueCard";

/**
 * The homepage title carries the brand first and then the company's own
 * description of itself, because a brand nobody has met yet gives a search
 * result nothing to match on and a reader nothing to read. Both halves are
 * the hero sentence verbatim.
 *
 * The description names Cue on purpose. The likeliest route to this page is
 * someone who met Cue first and wants to know what company stands behind it;
 * a snippet that answers that question in the result earns the click.
 */
export const metadata: Metadata = buildMetadata({
  path: "",
  title: "Qasem Portal · Technology company building modern applications",
  absoluteTitle: true,
  description:
    "Qasem Portal builds and operates app-driven ventures for hospitality and adjacent sectors. Cue is its first venture. Registered in Dubai, United Arab Emirates.",
});

/**
 * The homepage is one grid, stated once and repeated: a fixed label column
 * on the left (the double rule and a tracked-caps eyebrow) and a content
 * column on the right, identical in every section, hero included, so the
 * section labels and the content edge sit on one vertical axis down the
 * page. Sections share one vertical rhythm and are separated by a single
 * hairline; the contact strip alone opens with the full-width double rule.
 * Typography carries the hierarchy. There is no imagery outside the Cue
 * card.
 *
 * Copy discipline: every sentence traces to a stated fact. The company is
 * described by what it builds and operates; Cue is its first venture, not
 * its identity. No em-dashes, no group-structure jargon, no figures.
 */

/** The direction, stated as intent. */
const DIRECTION_ROWS = [
  {
    term: "Vision",
    detail:
      "To address problems in the hospitality sector, and in the sectors adjacent to it, with modern applications.",
  },
  {
    term: "Goals",
    detail:
      "To build app-driven ventures and operate them, and to maintain a company structure that can house further ventures.",
  },
] as const;

/**
 * The shared section grid. Below md the label stacks above the content;
 * md gets an 11rem label so a 768px viewport keeps a readable content
 * column; lg and up carries the full 15rem label with the wide gutter.
 */
const GRID =
  "grid gap-10 md:grid-cols-[minmax(0,11rem)_1fr] md:gap-12 lg:grid-cols-[minmax(0,15rem)_1fr] lg:gap-20";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="rule-double w-16 text-ink" aria-hidden="true" />
      <p className="eyebrow mt-5">{children}</p>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <JsonLd data={siteJsonLd()} />

      {/* Hero: a typographic opening statement on the shared grid. */}
      <section aria-labelledby="hero-heading" className="container-site">
        <div className={`${GRID} pb-20 pt-20 sm:pb-28 sm:pt-32`}>
          <div className="anim-rise-1">
            <div className="anim-draw rule-double w-16 text-ink" aria-hidden="true" />
            <p className="eyebrow mt-5">Dubai, United Arab Emirates</p>
          </div>
          <div>
            <h1
              id="hero-heading"
              className="anim-rise-2 max-w-4xl text-[clamp(2.25rem,4.5vw,3rem)] leading-[1.1] tracking-[-0.01em]"
            >
              A technology company building modern applications for
              hospitality and adjacent sectors.
            </h1>
            <p className="anim-rise-3 mt-8 max-w-measure font-serif text-[1.25rem] leading-[1.6] text-muted">
              Qasem Portal builds and operates app-driven ventures, with an
              initial focus on the hospitality sector. The company is
              structured to house multiple ventures. Cue, the first, is the
              only one in operation today.
            </p>
            <div className="anim-rise-3 mt-10">
              <Link href="/portfolio" className="btn btn-primary">
                View the portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Vision and goals: the direction, as a register. */}
      <section aria-labelledby="direction-heading" className="container-site">
        <div className={`${GRID} border-t border-line py-20 sm:py-28`}>
          <SectionLabel>Vision and goals</SectionLabel>
          <div>
            <h2 id="direction-heading" className="text-2xl sm:text-[2rem]">
              What Qasem Portal sets out to do.
            </h2>
            <div className="mt-10 border-b border-line">
              {DIRECTION_ROWS.map((row) => (
                <div
                  key={row.term}
                  className="grid gap-3 border-t border-line py-7 lg:grid-cols-[11rem_1fr] lg:gap-8"
                >
                  <h3 className="font-serif text-xl">{row.term}</h3>
                  <p className="max-w-measure text-base leading-relaxed text-muted">
                    {row.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio: one entry today; the register extends as ventures are added. */}
      <section aria-labelledby="portfolio-heading" className="container-site">
        <div className={`${GRID} border-t border-line py-20 sm:py-28`}>
          <SectionLabel>Portfolio</SectionLabel>
          <div>
            <h2 id="portfolio-heading" className="text-2xl sm:text-[2rem]">
              One venture today.
            </h2>
            <p className="mt-6 max-w-measure text-base leading-relaxed text-muted">
              Cue is our first venture.
            </p>
            <ul className="mt-10 grid max-w-3xl gap-10">
              <li>
                <CueCard headingLevel="h3" />
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact strip: the one full-width double rule before the footer. The
          band has no bottom padding; the footer's top margin (mt-24 sm:mt-32)
          supplies the matching space below the content, so the strip sits
          centred between its rule and the footer's. */}
      <section aria-labelledby="contact-heading" className="container-site pt-8">
        <div className="rule-double text-ink" aria-hidden="true" />
        <div className={`${GRID} pt-24 sm:pt-32`}>
          {/* The full-width rule above stands in for the label's short rule. */}
          <div>
            <p className="eyebrow">Contact</p>
          </div>
          <div className="items-end justify-between gap-10 md:flex">
            <h2 id="contact-heading" className="max-w-xl text-2xl sm:text-[2rem]">
              General questions and careers both start in the same place.
            </h2>
            <div className="mt-8 shrink-0 md:mt-0">
              <Link
                href={withUtm("/contact", "home-contact-strip")}
                className="btn btn-primary"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
