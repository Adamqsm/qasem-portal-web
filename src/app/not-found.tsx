import type { Metadata } from "next";
import Link from "next/link";

/**
 * Next already answers this route with a 404 status and its own `noindex`,
 * which is what keeps it out of the index; a second robots tag here would
 * only duplicate that. The title is the real gain: without it every missing
 * URL shares the bare brand title with the homepage.
 */
export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <section className="container-site pb-24 pt-24 sm:pt-36">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-6 text-[clamp(2.375rem,5.5vw,3.75rem)] leading-[1.06]">
        Page not found.
      </h1>
      <div className="rule-double mt-8 w-36 text-ink" aria-hidden="true" />
      <p className="mt-8 max-w-measure text-[0.9375rem] leading-relaxed text-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="mt-10">
        <Link href="/" className="btn btn-primary">
          Return home
        </Link>
      </div>
    </section>
  );
}
