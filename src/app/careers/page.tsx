import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, pageJsonLd } from "@/lib/seo";
import { withUtm } from "@/lib/utm";
import {
  CAREERS_CLOSING,
  CAREERS_DESCRIPTION,
  CAREERS_PATH,
  CAREERS_SUBHEAD,
  CAREERS_TITLE,
  COMMITMENTS,
} from "@/lib/careers";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = buildMetadata({
  path: CAREERS_PATH,
  title: CAREERS_TITLE,
  description: CAREERS_DESCRIPTION,
  keywords: [
    "Qasem Portal careers",
    "Qasem Portal career growth",
    "Qasem Portal learning and development",
  ],
});

/**
 * The page is a register of three parts on the site's shared grid: the label
 * column carries the short double rule and a tracked-caps part number, the
 * content column carries the heading and the commitment itself. The parts are
 * separated by the hairline the homepage uses between its sections, and the
 * one full-width double rule is kept for the closing contact strip, as on the
 * portfolio page. No imagery, no icon, no accent: the type carries it.
 *
 * The copy lives in src/lib/careers.ts, where a test pins its substance.
 */
const GRID =
  "grid gap-10 md:grid-cols-[minmax(0,11rem)_1fr] md:gap-12 lg:grid-cols-[minmax(0,15rem)_1fr] lg:gap-20";

export default function CareersPage() {
  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: CAREERS_PATH,
          name: CAREERS_TITLE,
          description: CAREERS_DESCRIPTION,
        })}
      />

      <section className="container-site pb-14 pt-20 sm:pb-16 sm:pt-28">
        <p className="eyebrow">Careers</p>
        <h1 className="mt-6 max-w-3xl text-[clamp(2.375rem,5.5vw,3.75rem)] leading-[1.06] tracking-[-0.01em]">
          {CAREERS_TITLE}
        </h1>
        <p className="mt-8 max-w-measure font-serif text-xl leading-[1.65] text-muted">
          {CAREERS_SUBHEAD}
        </p>
      </section>

      {COMMITMENTS.map((part) => (
        <section
          key={part.id}
          id={part.id}
          aria-labelledby={`${part.id}-heading`}
          className="container-site scroll-mt-24"
        >
          <div className={`${GRID} border-t border-line py-14 sm:py-16`}>
            <div>
              <div className="rule-double w-16 text-ink" aria-hidden="true" />
              <p className="eyebrow mt-5">{part.label}</p>
            </div>
            <div className="max-w-2xl">
              <h2 id={`${part.id}-heading`} className="text-3xl sm:text-4xl">
                {part.heading}
              </h2>
              <p className="mt-6 max-w-measure text-base leading-relaxed text-muted">
                {part.body}
              </p>
            </div>
          </div>
        </section>
      ))}

      {/* The closing line: a statement, not a heading, set in the display
          face at reading weight so it reads as the page's last word. */}
      <section aria-labelledby="principle-label" className="container-site">
        <div className={`${GRID} border-t border-line py-14 sm:py-16`}>
          <div>
            <div className="rule-double w-16 text-ink" aria-hidden="true" />
            <p id="principle-label" className="eyebrow mt-5">
              The principle
            </p>
          </div>
          <p className="max-w-2xl font-serif text-2xl leading-[1.4] text-ink sm:text-[1.75rem]">
            {CAREERS_CLOSING}
          </p>
        </div>
      </section>

      {/* Contact strip: the one full-width double rule on the page. The link
          lands on the careers path of the contact page, which is where an
          introduction actually goes. */}
      <section
        aria-labelledby="introduce-heading"
        className="container-site pt-20 sm:pt-28"
      >
        <div className="rule-double text-ink" aria-hidden="true" />
        <div className="items-end justify-between gap-10 py-14 md:flex">
          <div className="max-w-xl">
            <h2 id="introduce-heading" className="text-3xl sm:text-4xl">
              Introduce yourself.
            </h2>
            <p className="mt-4 max-w-measure text-[0.9375rem] leading-relaxed text-muted">
              There are no open roles posted today. Capable people are still
              worth hearing from, through the careers path on the contact
              page.
            </p>
          </div>
          <div className="mt-8 shrink-0 md:mt-0">
            <Link
              href={withUtm("/contact#careers", "careers-cta")}
              className="btn btn-primary"
            >
              Contact
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
