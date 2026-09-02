import Link from "next/link";
import { NAV_ITEMS } from "@/lib/site";
import { Monogram, Wordmark } from "@/components/BrandWordmark";

const LEGAL_ITEMS = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Use" },
] as const;

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 sm:mt-32">
      <div className="container-site">
        <div className="rule-double text-ink" aria-hidden="true" />
        <div className="grid gap-12 py-12 sm:grid-cols-[1fr_auto_auto] sm:gap-20 sm:py-16">
          <div className="max-w-sm">
            <Wordmark heightPx={56} />
            <p className="mt-6 text-[0.9375rem] leading-relaxed text-muted">
              A technology company building modern applications for
              hospitality and adjacent sectors. Registered in Dubai, United
              Arab Emirates, under an apps and software activity licence.
            </p>
          </div>
          <nav aria-label="Site">
            <h2 className="eyebrow">Site</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/" className="link no-underline hover:underline">
                  Home
                </Link>
              </li>
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="link no-underline hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h2 className="eyebrow">Legal</h2>
            <ul className="mt-4 space-y-3">
              {LEGAL_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="link no-underline hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center justify-between border-t border-line py-6">
          <p className="text-[0.8125rem] text-faint">
            © {year} Qasem Portal. All rights reserved.
          </p>
          <Monogram sizePx={32} decorative />
        </div>
      </div>
    </footer>
  );
}
