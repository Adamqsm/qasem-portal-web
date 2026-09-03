import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LegalSection, LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = buildMetadata({
  path: "/legal/privacy",
  title: "Privacy Policy",
  description:
    "How Qasem Portal handles the information submitted through this site: what is collected, why, where it is stored, and the choices you have.",
});

const UPDATED = "September 2, 2026";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated={UPDATED}>
      <LegalSection heading="Who we are">
        <p>
          Qasem Portal is a technology company registered in Dubai, United
          Arab Emirates, and Cue is its first venture. This policy covers
          the website at qasem-portal.com. Cue&apos;s own products and
          websites have their own policies, published by Cue.
        </p>
      </LegalSection>

      <LegalSection heading="What this site collects">
        <p>
          This site has no accounts, no analytics, and no advertising. The only
          personal information it collects is what you choose to type into the
          contact or careers form:
        </p>
        <ul>
          <li>your name and email address,</li>
          <li>your message,</li>
          <li>
            on the careers form, an optional link you provide, such as a
            LinkedIn profile or portfolio.
          </li>
        </ul>
        <p>
          Alongside a submission we record the time it was sent, the page it
          came from, and, when present, the campaign parameters (utm tags) that
          brought you to the site. To limit abuse, the submission service also
          derives a salted, one-way hash of your network address; the address
          itself is not kept with your submission, and the hash expires from
          use within minutes.
        </p>
      </LegalSection>

      <LegalSection heading="How it is used">
        <p>
          Submissions are used to read and answer your message, and for
          careers messages, to consider you for current or future work. They
          are not used for marketing lists, profiling, or automated decisions,
          and they are never sold or shared for advertising.
        </p>
      </LegalSection>

      <LegalSection heading="Where it is stored and who processes it">
        <p>
          A submission is stored in our database and a copy is delivered to the
          company by email. The service providers that process this data on our
          behalf are:
        </p>
        <ul>
          <li>
            <strong>Vercel</strong>, which hosts the site and its server
            functions,
          </li>
          <li>
            <strong>Google Cloud (Firebase Firestore)</strong>, which stores
            submissions,
          </li>
          <li>
            <strong>Resend</strong>, which delivers the notification email,
          </li>
          <li>
            <strong>Cloudflare Turnstile</strong>, which checks that a
            submission comes from a person and not a script. Turnstile runs
            when you use a form and may process your network address and
            browser signals to make that check; see Cloudflare&apos;s own
            privacy documentation for detail.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Cookies and browser storage">
        <p>
          The site sets no cookies. It uses two small pieces of browser
          storage, both functional: your light or dark theme choice, kept on
          your device, and the first campaign parameters of your visit, kept
          for the browser session only so a submission you choose to send can
          record how you found us. Neither identifies you, and neither is
          shared with third parties.
        </p>
      </LegalSection>

      <LegalSection heading="Retention">
        <p>
          Submissions are kept for as long as they are relevant as business
          correspondence, then deleted. Careers messages are kept so that you
          can be considered for later opportunities, unless you ask us to
          remove them sooner.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can ask what we hold about you, ask for a correction, or ask for
          deletion at any time. Use the{" "}
          <Link href="/contact" className="link">
            contact form
          </Link>{" "}
          and we will act on the request promptly.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          This site is intended for a professional audience and does not
          knowingly collect information from children.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          If this policy changes, the new version is published here with an
          updated date at the top of the page.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
