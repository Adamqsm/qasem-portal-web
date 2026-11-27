import Link from "next/link";
import type { Consent } from "@/lib/consent";

/**
 * Analytics consent, English and Arabic together: the site itself is English
 * only, so each reader gets their own language in the same bar. Square and
 * monochrome like the rest of the site. z-[60]: over the sticky nav (50) and
 * the floating contact button (40).
 */
function Choice({
  en,
  ar,
  variant,
  onClick,
}: {
  en: string;
  ar: string;
  variant: "btn-primary" | "btn-ghost";
  onClick: () => void;
}) {
  return (
    <button type="button" className={`btn ${variant} px-6`} onClick={onClick}>
      <span>{en}</span>
      <span aria-hidden="true" className="h-4 w-px bg-current opacity-40" />
      <span lang="ar" dir="rtl" className="normal-case tracking-normal">
        {ar}
      </span>
    </button>
  );
}

export default function ConsentBanner({
  onChoose,
}: {
  onChoose: (choice: Consent) => void;
}) {
  return (
    <section
      aria-label="Analytics choice, خيار التحليلات"
      className="fixed inset-x-0 bottom-0 z-[60] border-t-2 border-ink bg-surface"
    >
      <div className="container-site py-5">
        <div className="grid gap-4 text-[0.875rem] leading-relaxed text-muted md:grid-cols-2 md:gap-10">
          <p lang="en">
            May we use Google Analytics to collect anonymous usage statistics,
            only to improve this site? It stays off unless you accept, and no
            advertising features are used.{" "}
            <Link href="/legal/privacy" className="link">
              Privacy Policy
            </Link>
          </p>
          <p
            lang="ar"
            dir="rtl"
            className="border-t border-line pt-4 text-base md:border-s md:border-t-0 md:ps-10 md:pt-0"
          >
            هل توافق على استخدام Google Analytics لجمع إحصاءات استخدام مجهولة
            الهوية لتحسين هذا الموقع فقط؟ لا يعمل إلا بموافقتك، ولا تُستخدم أي
            ميزات إعلانية.{" "}
            <Link href="/legal/privacy" className="link">
              سياسة الخصوصية
            </Link>
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Choice
            en="Accept"
            ar="قبول"
            variant="btn-primary"
            onClick={() => onChoose("granted")}
          />
          <Choice
            en="Decline"
            ar="رفض"
            variant="btn-ghost"
            onClick={() => onChoose("denied")}
          />
        </div>
      </div>
    </section>
  );
}
