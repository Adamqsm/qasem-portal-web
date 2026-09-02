import Image from "next/image";
import { CUE_URL } from "@/lib/site";

/**
 * The Cue portfolio entry. The double-rule frame is Qasem Portal's device
 * (from the QP monogram); everything inside the frame is Cue's own identity:
 * the concentric-rings mark, the Plus Jakarta Sans wordmark, and the
 * terracotta. That color must never appear outside this card.
 *
 * Imagery: the site carries no photography. The one scoped exception is the
 * strip of real product screens below, and it applies inside this card only.
 * The screens are the same captures Cue-web publishes, downscaled to 960px
 * WebP; each is shown as a top-anchored crop so the strip stays short and
 * the card reads as one entry in a register, not as the page's subject.
 * Below md the strip shows two screens (three would be unreadable at that
 * width); the caption follows suit.
 */

/**
 * Cue's mark, concentric "C" rings, as drawn in Cue-web's BrandMark.
 * Decorative here: it always sits beside the visible "Cue" name.
 */
function CueMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`block ${className}`}
      fill="none"
    >
      <circle
        cx="50"
        cy="50"
        r="40"
        pathLength={100}
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray="72 28"
        strokeDashoffset="-14"
      />
      <circle
        cx="50"
        cy="50"
        r="19"
        pathLength={100}
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray="70 30"
        strokeDashoffset="-15"
      />
    </svg>
  );
}

const REGISTER: { term: string; detail: string }[] = [
  { term: "Sector", detail: "Hospitality" },
  { term: "Languages", detail: "English and Arabic" },
  { term: "Initial market", detail: "Amman, Jordan" },
  { term: "Status", detail: "In operation" },
];

/** Real product screens (Cue-web's own captures), 960 x 2087 each. */
const SCREENS: { src: string; alt: string }[] = [
  {
    src: "/images/cue/cue-book-a-table.webp",
    alt: "Cue guest app: the Book a Table screen, with venue, date, and time selection.",
  },
  {
    src: "/images/cue/cue-reservation-submitted.webp",
    alt: "Cue guest app: the Reservation Submitted confirmation with the booking summary.",
  },
  {
    src: "/images/cue/cue-partner-dashboard.webp",
    alt: "Cue partner dashboard: the venue's daily overview of bookings.",
  },
];

type Props = {
  /**
   * Heading level for the venture name: h2 on /portfolio (directly under the
   * page h1), h3 on the homepage (under the portfolio section's h2).
   */
  headingLevel?: "h2" | "h3";
};

export default function CueCard({ headingLevel = "h2" }: Props) {
  const Heading = headingLevel;
  return (
    <article aria-labelledby="cue-card-title" className="text-ink">
      {/* Double-rule frame: thick outer, thin inner, like the monogram. */}
      <div className="border-2 border-current p-[5px]">
        <div className="border border-current p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex items-center gap-3.5">
              <CueMark className="h-9 w-9 text-cue" />
              <Heading
                id="cue-card-title"
                className="font-cue text-3xl font-bold tracking-tight text-cue"
              >
                Cue
              </Heading>
            </div>
            <p className="eyebrow">First venture</p>
          </div>

          <p className="mt-6 max-w-measure text-[0.9375rem] leading-relaxed text-muted">
            Cue is a restaurant reservation and venue booking app.
          </p>

          {/* Product screens: the one place imagery appears on the site. */}
          <figure className="mt-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {SCREENS.map((s, i) => (
                <div
                  key={s.src}
                  className={`relative aspect-[4/5] overflow-hidden border border-line bg-surface ${
                    i === 2 ? "hidden md:block" : ""
                  }`}
                >
                  <Image
                    src={s.src}
                    alt={s.alt}
                    fill
                    sizes="(min-width: 1024px) 14rem, (min-width: 768px) 30vw, 42vw"
                    className="object-cover object-top"
                  />
                </div>
              ))}
            </div>
            <figcaption className="mt-3 text-[0.8125rem] leading-normal text-faint">
              <span className="md:hidden">Guest booking and guest confirmation.</span>
              <span className="hidden md:inline">
                Guest booking, guest confirmation, and the partner dashboard.
              </span>
            </figcaption>
          </figure>

          <dl className="mt-8 border-t border-line">
            {REGISTER.map((row) => (
              <div
                key={row.term}
                className="grid gap-1 border-b border-line py-3.5 sm:grid-cols-[9rem_1fr] sm:gap-4"
              >
                <dt className="eyebrow self-center">{row.term}</dt>
                <dd className="text-[0.9375rem] text-ink">{row.detail}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8">
            <a
              href={CUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost whitespace-nowrap"
            >
              Learn more
              <span className="sr-only sm:not-sr-only"> at cue-app.net</span>
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="square"
                aria-hidden="true"
              >
                <path d="M4.5 11.5l7-7M5.5 4.5h6v6" />
              </svg>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
