/**
 * Shared frame for legal documents: title, a visible "last updated" date,
 * and a measured prose column. Children use <LegalSection> blocks.
 */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  /** Human-readable date, e.g. "September 2, 2026". */
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container-site pb-16 pt-20 sm:pt-28">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-6 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.06]">
        {title}
      </h1>
      <p className="mt-5 text-[0.9375rem] text-faint">Last updated {updated}.</p>
      <div className="rule-double mt-8 w-36 text-ink" aria-hidden="true" />
      <div className="mt-12 max-w-[46rem]">{children}</div>
    </section>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="font-serif text-2xl">{heading}</h2>
      <div className="mt-4 space-y-4 text-[0.9375rem] leading-relaxed text-muted [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}
