# Qasem Portal — corporate site

Marketing/corporate site for [qasem-portal.com](https://www.qasem-portal.com).
Qasem Portal is a technology company building modern applications for
hospitality and adjacent sectors. It builds and operates app-driven ventures;
Cue is its first. This site is its professional front door.

## Stack

- Next.js 14 (App Router, static prerender for every page) + TypeScript
- Tailwind CSS, tokens in `tailwind.config.ts` + `src/app/globals.css`
- Forms: server-side API route → Firebase Admin SDK → Firestore
  (no client-side Firebase SDK anywhere; Firestore rules are deny-all)
- Cloudflare Turnstile on both forms, fail-closed in production
- Resend for the notification email, sent from a verified
  qasem-portal.com address
- Deployed on Vercel, `main` = production

## Commands

```
npm install       # postinstall applies patches/ via patch-package
npm run dev
npm run build
npm run lint
npm run test
npx tsc --noEmit
```

## Environment

See `.env.example` — every variable is documented there, including which ones
fail closed when missing in production.

## Brand

`public/brand/` is the finalized asset set (wordmark, QP monogram, favicons).
Ink is `#111111`; there is no secondary brand color. Do not regenerate these
assets. Wordmark minimum width 120px; monogram minimum 32px; clear space of
at least the Q's height on every side.

Naming rule: "Qasem Portal" is the only entity name that appears in copy.
Never "holding company", never a suffixed legal variant.

## Deploy

See `docs/DEPLOY.md` for the full go-live runbook (Vercel, domain, Firebase
project, Turnstile, Resend/DNS email records, Search Console).
