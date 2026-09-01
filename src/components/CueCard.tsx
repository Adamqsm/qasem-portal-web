/**
 * The Cue portfolio entry. The double-rule frame is Qasem Portal's device
 * (from the QP monogram); everything inside the frame is Cue's own identity:
 * the concentric-rings mark, the Plus Jakarta Sans wordmark, and the
 * terracotta. That color must never appear outside this card.
 */
const CUE_SITE = "https://www.cue-app.net";

/**
 * Cue's mark — concentric "C" rings, as drawn in Cue-web's BrandMark.
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
  { term: "Sector", detail: "Hospitality technology" },
  { term: "Base", detail: "Amman, Jordan" },
  { term: "Languages", detail: "English and Arabic" },
  { term: "Status", detail: "Active" },
];

export default function CueCard() {
  return (
    <article aria-labelledby="cue-card-title" className="text-ink">
      {/* Double-rule frame: thick outer, thin inner, like the monogram. */}
      <div className="border-2 border-current p-[5px]">
        <div className="border border-current p-7 sm:p-12">
          <div className="flex items-center gap-4">
            <CueMark className="h-11 w-11 text-cue" />
            <h2 id="cue-card-title" className="font-cue text-4xl font-bold tracking-tight text-cue">
              Cue
            </h2>
          </div>

          <p className="mt-6 font-serif text-xl italic leading-relaxed text-muted">
            Simple for guests, structured for operators.
          </p>

          <p className="mt-5 max-w-measure text-[0.9375rem] leading-relaxed text-muted">
            Cue is a restaurant reservation and venue booking platform built
            for Amman, Jordan. Guests book tables in English or Arabic in a
            few taps; venues get a structured view of their floor, their
            bookings, and their day. Cue operates under its own entity and
            local law, with Qasem Portal as its parent company.
          </p>

          <dl className="mt-8 border-t border-line">
            {REGISTER.map((row) => (
              <div
                key={row.term}
                className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-line py-3.5"
              >
                <dt className="eyebrow self-center">{row.term}</dt>
                <dd className="text-[0.9375rem] text-ink">{row.detail}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-9">
            <a
              href={CUE_SITE}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              Visit cue-app.net
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
