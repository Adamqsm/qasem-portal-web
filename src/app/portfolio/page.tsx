import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { withUtm } from "@/lib/utm";
import CueCard from "@/components/CueCard";

export const metadata: Metadata = buildMetadata({
  path: "/portfolio",
  title: "Portfolio",
  description:
    "The ventures under Qasem Portal. Today, Cue: a restaurant reservation and venue booking platform in Amman, Jordan.",
});

export default function PortfolioPage() {
  return (
    <>
      <section className="container-site pb-16 pt-20 sm:pb-20 sm:pt-28">
        <p className="eyebrow">The portfolio</p>
        <h1 className="mt-6 max-w-3xl text-[clamp(2.375rem,5.5vw,3.75rem)] leading-[1.06] tracking-[-0.01em]">
          Ventures under Qasem Portal.
        </h1>
        <p className="mt-8 max-w-measure font-serif text-xl leading-[1.65] text-muted">
          Each venture operates under its own entity and its own brand, with
          Qasem Portal above it. There is one venture today.
        </p>
      </section>

      {/* The venture register: today a single entry. The list simply grows
          as ventures are established; the layout does not change. */}
      <section aria-label="Ventures" className="container-site">
        <ul className="grid max-w-3xl gap-10">
          <li>
            <CueCard />
          </li>
        </ul>
        <p className="mt-10 max-w-measure text-[0.9375rem] leading-relaxed text-faint">
          Further ventures will be listed here as they are established.
        </p>
      </section>

      <section className="container-site pt-20 sm:pt-28">
        <div className="rule-double text-ink" aria-hidden="true" />
        <div className="items-end justify-between gap-10 py-14 sm:flex">
          <h2 className="max-w-xl text-3xl sm:text-4xl">
            Working on something that belongs here?
          </h2>
          <div className="mt-8 sm:mt-0">
            <Link
              href={withUtm("/contact", "portfolio-cta")}
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
