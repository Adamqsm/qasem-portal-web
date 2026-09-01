import type { Metadata, Viewport } from "next";
import { EB_Garamond, Libre_Franklin, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FloatingContact from "@/components/FloatingContact";
import UtmCapture from "@/components/UtmCapture";

/**
 * Typography: EB Garamond carries the display voice (the brand's own serif
 * register — the signature block specifies Garamond), Libre Franklin carries
 * UI, labels and body. Both self-hosted through next/font, which is what the
 * CSP's `font-src 'self'` requires. Plus Jakarta Sans is subset to the three
 * glyphs of "Cue" — it exists solely so the Cue portfolio card can set the
 * venture's name in the venture's own face.
 */
const garamond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const franklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jakartaCue = Plus_Jakarta_Sans({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-cue",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/favicon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

// Set the theme class before paint to avoid a flash of the wrong mode.
const themeScript = `(function(){try{var t=localStorage.getItem('qp-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Font-variable classes live on <body>, not <html>: the no-flash
          script writes the `dark` class onto <html>, and keeping <html> free
          of any React-managed className stops hydration from reconciling it
          away (learned on Cue — it caused a light-mode flash). */}
      <body
        className={`${garamond.variable} ${franklin.variable} ${jakartaCue.variable} min-h-screen`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:font-semibold focus:text-paper"
        >
          Skip to content
        </a>
        <UtmCapture />
        <Nav />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer />
        <FloatingContact />
      </body>
    </html>
  );
}
