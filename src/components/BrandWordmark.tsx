import Image from "next/image";

/**
 * The finalized wordmark and monogram assets, theme-paired. These are the
 * traced vector originals from the brand package — never regenerated, never
 * recolored beyond the provided ink/paper variants. (SVGs pass through
 * next/image unoptimized; the component exists for the light/dark pairing
 * and the enforced intrinsic sizing.)
 *
 * Brand minimums: wordmark no smaller than 120px wide, monogram no smaller
 * than 32px. Callers pass sizes that respect those.
 */

const WORDMARK_RATIO = 2400 / 937; // intrinsic aspect of the wordmark SVG

export function Wordmark({
  heightPx,
  className = "",
}: {
  heightPx: number;
  className?: string;
}) {
  const width = Math.round(heightPx * WORDMARK_RATIO);
  return (
    <span className={`inline-block ${className}`}>
      <Image
        src="/brand/wordmark-ink.svg"
        alt="Qasem Portal"
        width={width}
        height={heightPx}
        className="block dark:hidden"
        priority
      />
      <Image
        src="/brand/wordmark-paper.svg"
        alt=""
        aria-hidden="true"
        width={width}
        height={heightPx}
        className="hidden dark:block"
        priority
      />
    </span>
  );
}

export function Monogram({
  sizePx,
  className = "",
  decorative = false,
}: {
  sizePx: number;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <span className={`inline-block ${className}`}>
      <Image
        src="/brand/monogram-ink.svg"
        alt={decorative ? "" : "Qasem Portal monogram"}
        aria-hidden={decorative || undefined}
        width={sizePx}
        height={sizePx}
        className="block dark:hidden"
      />
      <Image
        src="/brand/monogram-paper.svg"
        alt=""
        aria-hidden="true"
        width={sizePx}
        height={sizePx}
        className="hidden dark:block"
      />
    </span>
  );
}
