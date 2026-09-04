import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, pageJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import ContactForm from "@/components/ContactForm";

const DESCRIPTION =
  "Two paths to reach Qasem Portal: general inquiries about the company or its ventures, and careers. Both are read directly.";

export const metadata: Metadata = buildMetadata({
  path: "/contact",
  title: "Contact",
  description: DESCRIPTION,
  keywords: ["contact Qasem Portal", "Qasem Portal careers"],
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={pageJsonLd({
          path: "/contact",
          name: "Contact",
          description: DESCRIPTION,
          type: "ContactPage",
        })}
      />

      <section className="container-site pb-14 pt-20 sm:pb-16 sm:pt-28">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-6 max-w-3xl text-[clamp(2.375rem,5.5vw,3.75rem)] leading-[1.06] tracking-[-0.01em]">
          Reach the company.
        </h1>
        <p className="mt-8 max-w-measure font-serif text-xl leading-[1.65] text-muted">
          Two paths. General questions about Qasem Portal or its ventures go
          in the first, careers in the second. Both are read directly.
        </p>
        <nav aria-label="Contact sections" className="mt-8 flex flex-wrap gap-6">
          <a href="#general" className="link">
            General inquiries
          </a>
          <a href="#careers" className="link">
            Careers
          </a>
        </nav>
      </section>

      <section
        id="general"
        aria-labelledby="general-heading"
        className="container-site scroll-mt-24 py-14 sm:py-16"
      >
        <div className="grid gap-10 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-20">
          <div>
            <div className="rule-double w-16 text-ink" aria-hidden="true" />
            <p className="eyebrow mt-5">Path one</p>
          </div>
          <div className="max-w-2xl">
            <h2 id="general-heading" className="text-3xl sm:text-4xl">
              General inquiries.
            </h2>
            <p className="mt-4 max-w-measure text-[0.9375rem] leading-relaxed text-muted">
              Questions about Qasem Portal, a venture, or a matter you would
              like to raise with the company.
            </p>
            <div className="mt-10">
              <ContactForm kind="general" />
            </div>
          </div>
        </div>
      </section>

      <section
        id="careers"
        aria-labelledby="careers-heading"
        className="container-site scroll-mt-24 py-14 sm:py-16"
      >
        <div className="grid gap-10 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-20">
          <div>
            <div className="rule-double w-16 text-ink" aria-hidden="true" />
            <p className="eyebrow mt-5">Path two</p>
          </div>
          <div className="max-w-2xl">
            <h2 id="careers-heading" className="text-3xl sm:text-4xl">
              Careers.
            </h2>
            <p className="mt-4 max-w-measure text-[0.9375rem] leading-relaxed text-muted">
              There are no open roles posted today. Capable people are still
              worth hearing from: introduce yourself, and if there is a fit at
              Qasem Portal or one of its ventures, now or later, you will hear
              back.
            </p>
            <p className="mt-4 max-w-measure text-[0.9375rem] leading-relaxed text-muted">
              What the company commits to the people it employs is set out
              on the{" "}
              <Link href="/careers" className="link">
                Career Growth and Learning
              </Link>{" "}
              page.
            </p>
            <div className="mt-10">
              <ContactForm kind="careers" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
