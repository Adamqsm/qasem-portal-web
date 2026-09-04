import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, pageJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { LegalSection, LegalShell } from "@/components/LegalShell";

const DESCRIPTION =
  "The terms that govern use of the Qasem Portal website at qasem-portal.com.";

export const metadata: Metadata = buildMetadata({
  path: "/legal/terms",
  title: "Terms of Use",
  description: DESCRIPTION,
});

const UPDATED = "September 2, 2026";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use" updated={UPDATED}>
      <JsonLd
        data={pageJsonLd({
          path: "/legal/terms",
          name: "Terms of Use",
          description: DESCRIPTION,
        })}
      />
      <LegalSection heading="Agreement">
        <p>
          These terms govern your use of the website at qasem-portal.com,
          operated by Qasem Portal, registered in Dubai, United Arab Emirates.
          By using the site you accept these terms. If you do not accept them,
          do not use the site.
        </p>
      </LegalSection>

      <LegalSection heading="Use of the site">
        <p>
          The site exists to describe Qasem Portal and its ventures and to let
          you contact the company. You agree not to misuse it: no attempts to
          probe, overload, or disrupt the site or its forms, no automated
          scraping of submissions endpoints, and no use of the forms to send
          unlawful, deceptive, or abusive content.
        </p>
      </LegalSection>

      <LegalSection heading="Intellectual property">
        <p>
          The Qasem Portal name, wordmark, monogram, and the content of this
          site belong to Qasem Portal. The Cue name and brand belong to the
          Cue venture. Nothing on this site grants a licence to use them.
          Content is published for information only.
        </p>
      </LegalSection>

      <LegalSection heading="Submissions">
        <p>
          Material you send through the contact or careers form is handled as
          described in the{" "}
          <Link href="/legal/privacy" className="link">
            Privacy Policy
          </Link>
          . Sending a message does not create any engagement, employment, or
          advisory relationship, and does not oblige the company to respond,
          although we read what we receive.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party sites">
        <p>
          The site links to websites operated by others, including Cue&apos;s
          own site at cue-app.net. Those sites have their own terms and
          policies, and Qasem Portal is not responsible for their content.
        </p>
      </LegalSection>

      <LegalSection heading="No warranties">
        <p>
          The site is provided as is and as available. While we aim to keep
          its content accurate and current, it is general information, not
          advice, and we make no warranties about completeness, availability,
          or fitness for a particular purpose.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, Qasem Portal is not liable
          for indirect or consequential loss arising from use of this site.
          Nothing in these terms excludes liability that cannot be excluded
          under applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws applicable in the Emirate of
          Dubai, United Arab Emirates, and disputes arising from them are
          subject to the jurisdiction of the courts of Dubai.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          If these terms change, the new version is published here with an
          updated date at the top of the page. Continued use of the site after
          a change means you accept the updated terms.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
