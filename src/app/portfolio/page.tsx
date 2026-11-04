import type { Metadata } from "next";
import { buildMetadata, portfolioJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import CueCard from "@/components/CueCard";

export const metadata: Metadata = buildMetadata({
  path: "/portfolio",
  title: "Portfolio: Cue",
  description:
    "Cue, the restaurant reservation and venue booking app from Amman, Jordan, is the venture Qasem Portal builds and operates.",
  keywords: ["Qasem Portal ventures", "Cue venture", "Cue restaurant reservation app"],
});

export default function PortfolioPage() {
  return (
    <>
      <JsonLd data={portfolioJsonLd()} />

      <section className="container-site pb-16 pt-20 sm:pb-20 sm:pt-28">
        <h1 className="max-w-3xl text-[clamp(2.375rem,5.5vw,3.75rem)] leading-[1.06] tracking-[-0.01em]">
          Qasem Portal&apos;s ventures.
        </h1>
        <p className="mt-8 max-w-measure font-serif text-xl leading-[1.65] text-muted">
          Each venture operates under its own entity and its own brand,
          within Qasem Portal. There is one venture today.
        </p>
      </section>

      {/* The venture register: a single entry. Copy here implies no wider
          portfolio (Adam, 4 Nov 2026): no "further ventures" note and no
          call for submissions. Contact stays one click away in the nav,
          the footer and the floating button. */}
      <section aria-label="Ventures" className="container-site">
        <ul className="grid max-w-3xl gap-10">
          <li>
            <CueCard />
          </li>
        </ul>
      </section>
    </>
  );
}
