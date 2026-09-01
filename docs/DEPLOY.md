# Go-live runbook — qasem-portal.com

Everything code-side is done and verified locally. This is the ~40 minute
manual pass that needs Adam's accounts, in order. Every gotcha listed here
was hit for real on Cue; none of them are hypothetical.

## 1. Vercel project

1. Push this repo to GitHub (`Adamqsm/qasem-portal-web`, main = production).
2. Vercel → Add New Project → import the repo. Framework preset: Next.js.
   No custom build settings needed (`patch-package` runs via postinstall).
3. Do not add env vars yet — do it in step 2 so the first real deploy has
   everything.

## 2. Environment variables (Vercel → Settings → Environment Variables)

| Name | Value | Scope |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://www.qasem-portal.com` | Production |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | from step 4 | Production + Preview |
| `TURNSTILE_SECRET_KEY` | from step 4 | Production + Preview |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | base64 of the key from step 3 | Production + Preview |
| `IP_HASH_SALT` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Production + Preview |
| `RESEND_API_KEY` | from step 5 | Production |
| `CONTACT_INBOX` | `adam@qasem-portal.com` (or preferred inbox) | Production |
| `MAIL_FROM` | `Qasem Portal <notifications@qasem-portal.com>` | Production |

BOM WARNING (Cue lost partner leads to this): paste every value through a
plain text editor first. After saving, if anything misbehaves, suspect an
invisible leading BOM character before anything else.

Missing-value behavior is fail-closed by design: without the Turnstile
secret, the service account, or the salt, `/api/contact` returns 503 and
nothing is accepted unmetered. `RESEND_API_KEY` is the one optional var:
submissions still store without it, only the courtesy email is skipped.

## 3. Firebase project (Firestore only — no Cloud Functions exist)

1. console.firebase.google.com → Add project → `qasem-portal` (analytics off).
2. Create Firestore database → location `me-central1` (same region family
   as Cue). Production mode.
3. Deploy the rules from this repo (deny-all, deliberately):

   ```bash
   firebase use --add   # pick the new project, alias "default"
   firebase deploy --only firestore:rules
   ```

4. Verify the deployed rules against the repo (do not assume): Firebase
   console → Firestore → Rules must read exactly like `firestore.rules`
   (a single deny-all match). Cue shipped a collection with NO rule and
   silently lost real submissions for weeks; this repo's posture is that
   no client rule ever exists.
5. Service account: Project settings → Service accounts → Generate new
   private key. Base64 it for the env var:

   ```bash
   node -e "console.log(Buffer.from(require('fs').readFileSync('key.json')).toString('base64'))"
   ```

   Store the source `key.json` in an encrypted vault (Bitwarden/1Password),
   then delete the loose file. If it is ever suspected exposed, rotate it
   immediately (Service accounts → manage → delete key, generate new).

## 4. Cloudflare Turnstile

1. Cloudflare dashboard → Turnstile → Add site → name `qasem-portal.com`,
   mode Managed.
2. Hostnames — add BOTH from day one (Cue's widget silently failed on
   preview URLs because only production was allowlisted):
   - `qasem-portal.com` (covers www)
   - `vercel.app` (covers every preview deployment)
3. Copy the site key + secret key into the Vercel env vars.

## 5. Resend + email DNS (Squarespace DNS panel)

1. resend.com → Domains → Add `qasem-portal.com`, sending region closest
   available. Resend shows exact DNS records; add them in Squarespace:
   - DKIM: `resend._domainkey` TXT (verbatim from Resend)
   - SPF + MX on the `send` subdomain (verbatim from Resend). These are
     additive: they do not touch the root SPF/MX that Google Workspace mail
     already uses.
2. Wait for "Verified" in Resend, then create the API key (sending access
   only) → Vercel env.
3. **Turn tracking OFF**: Resend → the domain → settings → open tracking
   and click tracking both disabled. The email template is text-only
   precisely so nothing can re-add a pixel. This was a real deliverability
   factor on Cue.
4. DMARC (root cause of Cue's spam placement was missing/misaligned auth,
   not the sender): add TXT at `_dmarc`:

   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@qasem-portal.com; fo=1
   ```

   First create `dmarc-reports@qasem-portal.com` as a Workspace group so
   the reports actually land somewhere monitored. If the root domain has no
   SPF/DKIM yet for Workspace itself, finish that first (Admin console →
   Gmail → Authenticate email) so alignment passes before quarantine bites.
5. Register the domain in Google Postmaster Tools (postmaster.google.com).

## 6. Production domain (same pattern as cue-app.net)

1. Vercel → Project → Settings → Domains → add `www.qasem-portal.com` and
   `qasem-portal.com`; set `www` as primary so the apex 308-redirects to it
   (this matches `NEXT_PUBLIC_SITE_URL` and every canonical/OG URL).
2. Squarespace DNS: add the records Vercel displays (apex A `76.76.21.21`,
   `www` CNAME `cname.vercel-dns.com` — use whatever Vercel shows, it is
   authoritative).
3. After propagation, `curl -I https://qasem-portal.com` must 308 to
   `https://www.qasem-portal.com/`.

## 7. Search Console

1. search.google.com/search-console → add property `qasem-portal.com`
   (domain property, DNS TXT verification in Squarespace).
2. Submit `https://www.qasem-portal.com/sitemap.xml`.

## 8. Account security (confirm, before announcing the site)

- [ ] WHOIS privacy ON and registrar lock ON for qasem-portal.com.
- [ ] 2FA on the Squarespace account that holds DNS.
- [ ] 2SV on the Workspace super-admin account. Do NOT enforce tenant-wide
      2SV until Adam has confirmed his own recovery path works — he is the
      sole super admin.
- [ ] Service-account key lives only in the vault + Vercel env.

## 9. Post-deploy verification (15 minutes, all of it)

- [ ] `curl -sI https://www.qasem-portal.com | grep -iE "content-security|frame|referrer|strict-transport"`
      shows the full header set from `next.config.mjs`.
- [ ] Submit the contact form once on a PREVIEW deployment (proves the
      Turnstile `vercel.app` hostname) and once on production. Each lands
      in Firestore (`contactSubmissions`) AND in the inbox, with reply-to
      set to the sender.
- [ ] Careers form once on production (`careerSubmissions`).
- [ ] Check the notification email lands in Inbox, not Spam; open the raw
      headers and confirm SPF=pass, DKIM=pass, DMARC=pass.
- [ ] Firestore console: submission docs show `ipHash`, never an address.
- [ ] Vercel function logs for `/api/contact`: masked emails only
      (`a***@example.com`), no plaintext PII.
- [ ] LinkedIn Post Inspector (linkedin.com/post-inspector) on
      `https://www.qasem-portal.com` renders the wordmark OG card.
- [ ] Light + dark, desktop + mobile spot check on production.
- [ ] `https://www.qasem-portal.com/robots.txt` and `/sitemap.xml` live.

## Local development

```bash
npm install
npm run dev            # or: npm run build && npm start
```

`.env.local` for a full local loop (all values safe to keep locally):

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
FIRESTORE_EMULATOR_HOST=127.0.0.1:8391
IP_HASH_SALT=local-dev-salt-not-production
```

Run the Firestore emulator alongside: `firebase emulators:start --only
firestore --project qasem-portal-demo`. With the emulator down the form
API 503s (fail closed) — that is correct behavior, not a bug.

Windows note: local prod builds work on Node 20 and Node 24 because
`patches/next+14.2.35.patch` fixes `@vercel/og`'s file-URL resolution
(applied automatically by postinstall). Without it, OG prerendering dies
with `TypeError: Invalid URL` on Windows.
