/**
 * Security headers, set from the first deploy (Cue shipped with none and had
 * to retrofit — this repo starts hardened).
 *
 * CSP notes:
 * - `frame-ancestors 'none'` blocks clickjacking overlays on the contact and
 *   careers forms; X-Frame-Options below is the legacy twin.
 * - `form-action 'self'` stops an injected <form> from POSTing a submitter's
 *   name/email/message to an attacker-controlled origin.
 * - `script-src` keeps 'unsafe-inline' deliberately: Next 14's App Router
 *   emits per-request inline bootstrap scripts, and the JSON-LD blocks are
 *   inline too. The strict alternative is a per-request nonce, which opts
 *   every page out of static rendering — not a trade worth making for a
 *   statically generated corporate site. 'unsafe-eval' is NOT granted.
 * - challenges.cloudflare.com is Cloudflare Turnstile: the api.js script tag
 *   plus the challenge iframe. No other third party loads anything.
 * - There is no client-side Firebase SDK in this app (all Firestore access is
 *   server-side through the Admin SDK), so connect-src needs no Google hosts.
 * - Fonts are self-hosted through next/font, hence `font-src 'self'`.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Same-origin gets the full path; cross-origin gets only the origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing on this site needs these; deny them so injected script can't ask.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Exactly what hstspreload.org requires: max-age >= 1 year, includeSubDomains,
  // preload. Vercel's default (max-age=63072000, no directives) is overridden
  // by this value. `preload` was added on Adam's explicit decision (2026-09-04);
  // the preload list is effectively irreversible, so do not drop it casually.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Apex -> www is served by the app (not as a Vercel project-domain
  // redirect) so the 308 itself carries the security headers above.
  // hstspreload.org checks the HSTS header on the apex redirect response, and
  // the platform-level domain redirect only sends Vercel's bare default.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "qasem-portal.com" }],
        destination: "https://www.qasem-portal.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
