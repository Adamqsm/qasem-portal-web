import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, siteJsonLd } from "@/lib/seo";
import { SITE_DESCRIPTION } from "@/lib/site";
import { withUtm } from "@/lib/utm";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = buildMetadata({
  path: "",
  title: "Qasem Portal",
  description: SITE_DESCRIPTION,
});

/** The register rows of the role section — what the parent level carries. */
const ROLE_ROWS = [
  {
    term: "Licensing",
    detail:
      "Qasem Portal is registered in Dubai, United Arab Emirates, and carries the commercial licensing under which its ventures are established.",
  },
  {
    term: "Legal",
    detail:
      "Agreements, policies, and obligations are set once at the parent level and applied consistently across everything the company operates.",
  },
  {
    term: "Governance",
    detail:
      "Each venture runs day to day under its own entity and local law, with Qasem Portal responsible for standards and oversight.",
  },
] as const;

export default function Home() {
  return (
    <>
      <JsonLd data={siteJsonLd()} />

      {/* Hero — a typographic opening page, no imagery by design. */}
      <section className="container-site pb-24 pt-20 sm:pb-32 sm:pt-32">
        <p className="eyebrow anim-rise-1">Dubai, United Arab Emirates</p>
        <h1 className="anim-rise-2 mt-6 max-w-4xl text-[clamp(2.75rem,7vw,5rem)] leading-[1.04] tracking-[-0.015em]">
          The parent company of Cue.
        </h1>
        <div className="anim-draw rule-double mt-10 w-36 text-ink" aria-hidden="true" />
        <p className="anim-rise-3 mt-10 max-w-measure font-serif text-[1.3125rem] leading-[1.65] text-muted">
          Qasem Portal is the corporate structure above Cue: the licensing,
          legal, and governance layer that lets the venture operate under its
          own entity and local law.
        </p>
        <div className="anim-rise-3 mt-12 flex flex-wrap gap-4">
          <Link href="/portfolio" className="btn btn-primary">
            View the portfolio
          </Link>
          <Link href={withUtm("/contact", "hero")} className="btn btn-ghost">
            Contact
          </Link>
        </div>
      </section>

      {/* The role — a register, not feature cards. */}
      <section
        aria-labelledby="role-heading"
        className="container-site py-20 sm:py-28"
      >
        <div className="grid gap-10 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-20">
          <div>
            <div className="rule-double w-16 text-ink" aria-hidden="true" />
            <p className="eyebrow mt-5">The role</p>
          </div>
          <div>
            <h2 id="role-heading" className="text-3xl sm:text-4xl">
              What Qasem Portal does.
            </h2>
            <div className="mt-10 border-b border-line">
              {ROLE_ROWS.map((row) => (
                <div
                  key={row.term}
                  className="grid gap-3 border-t border-line py-8 sm:grid-cols-[11rem_1fr] sm:gap-8"
                >
                  <h3 className="font-serif text-xl">{row.term}</h3>
                  <p className="max-w-measure text-[0.9375rem] leading-relaxed text-muted">
                    {row.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio teaser — one venture today, stated plainly. */}
      <section
        aria-labelledby="portfolio-heading"
        className="container-site py-20 sm:py-28"
      >
        <div className="grid gap-10 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-20">
          <div>
            <div className="rule-double w-16 text-ink" aria-hidden="true" />
            <p className="eyebrow mt-5">The portfolio</p>
          </div>
          <div>
            <h2 id="portfolio-heading" className="text-3xl sm:text-4xl">
              One venture today.
            </h2>
            <p className="mt-6 max-w-measure text-[0.9375rem] leading-relaxed text-muted">
              Cue, a restaurant reservation and venue booking platform in
              Amman, Jordan. It runs under its own entity and its own brand,
              with Qasem Portal above it.
            </p>
            <div className="mt-10">
              <Link href="/portfolio" className="btn btn-ghost">
                See the portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact strip */}
      <section aria-labelledby="contact-heading" className="container-site pt-8">
        <div className="rule-double text-ink" aria-hidden="true" />
        <div className="items-end justify-between gap-10 py-14 sm:flex sm:py-20">
          <div>
            <p className="eyebrow">Contact</p>
            <h2 id="contact-heading" className="mt-4 max-w-xl text-3xl sm:text-4xl">
              General questions and careers both start in the same place.
            </h2>
          </div>
          <div className="mt-8 sm:mt-0">
            <Link
              href={withUtm("/contact", "home-contact-strip")}
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
