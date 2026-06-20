import type { Metadata } from "next";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal-page-layout";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_JURISDICTION,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Myanify, the Myanmar music streaming application.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      effectiveDate={LEGAL_EFFECTIVE_DATE}
    >
      <LegalSection title="1. Acceptance of Terms">
        <p>
          Welcome to Myanify (&quot;App,&quot; &quot;we,&quot; &quot;us,&quot;
          or &quot;our&quot;). By downloading, accessing, or using the Myanify
          application and its services (the &quot;Service&quot;), you agree to be
          bound by these Terms of Service (&quot;Terms&quot;). If you do not
          agree to these Terms, you must not use the Service.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          You must be at least 13 years old to use this Service. By using the
          Service, you represent and warrant that you meet this age requirement.
        </p>
      </LegalSection>

      <LegalSection title="3. Description of Service & Intellectual Property">
        <p>
          Myanify is an unofficial music streaming service that provides access
          to a library of Myanmar music content. The Service is for your
          personal, non-commercial, entertainment use only.
        </p>
        <p>
          <strong className="text-foreground">Important:</strong> All music,
          lyrics, and other content available on Myanify is the intellectual
          property of its respective owners (artists, record labels, publishers,
          etc.). Myanify does not claim ownership of this content. Your use of
          the Service does not grant you any rights to the content itself.
        </p>
      </LegalSection>

      <LegalSection title="4. User Accounts">
        <p>
          To access certain features, you may need to create an account. You are
          responsible for maintaining the confidentiality of your account
          credentials and for all activities that occur under your account. You
          agree to provide accurate and complete information when creating your
          account.
        </p>
      </LegalSection>

      <LegalSection title="5. User Conduct">
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Violate any applicable law or regulation.</li>
          <li>Infringe upon the intellectual property rights of others.</li>
          <li>
            Upload, transmit, or share any content that is unlawful, harmful,
            defamatory, or offensive.
          </li>
          <li>Attempt to gain unauthorized access to any part of the Service.</li>
          <li>
            Use the Service for any commercial purpose without our express
            written consent.
          </li>
          <li>
            Reproduce, distribute, modify, create derivative works of, or
            publicly display any content from the Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Copyright Infringement & Takedown Policy">
        <p>
          We respect the intellectual property rights of others. If you are a
          copyright owner or an agent thereof and believe that any content on
          Myanify infringes upon your copyrights, you may submit a notification
          by providing our designated Copyright Agent with the following
          information:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            A physical or electronic signature of the copyright owner or a person
            authorized to act on their behalf.
          </li>
          <li>
            Identification of the copyrighted work claimed to have been
            infringed.
          </li>
          <li>
            Identification of the material that is claimed to be infringing and
            that is to be removed.
          </li>
          <li>
            Your contact information, such as an address, telephone number, and
            email address.
          </li>
          <li>
            A statement that you have a good faith belief that the use of the
            material is not authorized.
          </li>
          <li>
            A statement that the information in the notification is accurate
            and, under penalty of perjury, that you are authorized to act on
            behalf of the copyright owner.
          </li>
        </ul>
        <p>
          Copyright Agent Contact:{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-primary hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          We reserve the right to terminate or suspend your account and access
          to the Service at our sole discretion, without prior notice or
          liability, for any reason, including but not limited to a breach of
          these Terms.
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimer of Warranties & Limitation of Liability">
        <p>
          THE SERVICE AND ALL CONTENT PROVIDED THEREIN ARE PROVIDED ON AN
          &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS. MYANIFY EXPRESSLY
          DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT.
        </p>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, MYANIFY SHALL NOT BE LIABLE
          FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
          DAMAGES, OR FOR ANY LOSS OF PROFITS OR DATA, ARISING OUT OF OR
          RELATING TO YOUR USE OR INABILITY TO USE THE SERVICE.
        </p>
      </LegalSection>

      <LegalSection title="9. Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of {LEGAL_JURISDICTION}.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to These Terms">
        <p>
          We reserve the right to modify or replace these Terms at any time. If
          a revision is material, we will provide at least 30 days&apos; notice
          prior to any new terms taking effect. By continuing to use the Service
          after those revisions become effective, you agree to be bound by the
          revised terms.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact Us">
        <p>
          If you have any questions about these Terms, please contact us at:{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-primary hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
