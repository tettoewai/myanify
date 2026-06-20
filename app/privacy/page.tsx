import type { Metadata } from "next";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal-page-layout";
import { LEGAL_CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Myanify, the Myanmar music streaming application.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      effectiveDate={LEGAL_EFFECTIVE_DATE}
    >
      <LegalSection title="1. Introduction">
        <p>
          Myanify (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects
          your privacy. This Privacy Policy explains how we collect, use, and
          disclose information about you when you use our mobile application and
          services (the &quot;Service&quot;).
        </p>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <p>We collect the following types of information:</p>
        <p className="font-medium text-foreground">
          Information You Provide to Us:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-foreground">Account Information:</strong>{" "}
            When you create an account, we may collect your name, email address,
            and a username/password.
          </li>
          <li>
            <strong className="text-foreground">Profile Information:</strong>{" "}
            Any information you choose to add to your profile, such as a profile
            picture.
          </li>
          <li>
            <strong className="text-foreground">User Content:</strong> Any
            content you voluntarily upload, share, or create on the Service,
            such as playlists.
          </li>
        </ul>
        <p className="font-medium text-foreground">
          Information Automatically Collected:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-foreground">Usage Information:</strong> We
            collect information about your interactions with the Service, such as
            the songs you play, search queries, playlists you create, and the
            time you spend on the app. This is used to personalize your
            experience and improve the service.
          </li>
          <li>
            <strong className="text-foreground">Device Information:</strong> We
            collect information about the device you use to access the Service,
            such as your IP address, device model, operating system version,
            unique device identifiers, and network information.
          </li>
          <li>
            <strong className="text-foreground">Log Data:</strong> Our servers
            automatically record information (&quot;log data&quot;) when you use
            the Service, including your actions on the app and the date and time
            of your activities.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Provide, maintain, and improve the Service.</li>
          <li>
            Personalize your experience, such as by recommending music or artists
            we think you&apos;ll enjoy.
          </li>
          <li>
            Understand how users interact with the Service to help us fix bugs
            and improve features.
          </li>
          <li>
            Communicate with you, for example, to send you service updates,
            security alerts, and support messages.
          </li>
          <li>Prevent fraud, abuse, and illegal activity.</li>
          <li>For any other purpose with your consent.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. How We Share Your Information">
        <p>
          We do not sell your personal information. We may share your
          information in the following circumstances:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-foreground">Service Providers:</strong> With
            third-party vendors who perform services on our behalf, such as
            hosting, analytics, and customer support.
          </li>
          <li>
            <strong className="text-foreground">Legal Requirements:</strong> If
            required by law, or if we believe in good faith that such action is
            necessary to (a) comply with a legal obligation, (b) protect and
            defend our rights or property, (c) protect against legal liability,
            or (d) protect the safety of users or the public.
          </li>
          <li>
            <strong className="text-foreground">Business Transfers:</strong> In
            connection with, or during negotiations of, any merger, sale of
            company assets, financing, or acquisition of all or a portion of
            our business to another company.
          </li>
          <li>
            <strong className="text-foreground">With Your Consent:</strong> In
            any other way, with your explicit consent.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Data Storage & Security">
        <p>
          We store your personal information on secure servers. While we
          implement reasonable and industry-standard security measures to
          protect your information, no method of transmission over the internet
          or electronic storage is 100% secure, and we cannot guarantee its
          absolute security.
        </p>
      </LegalSection>

      <LegalSection title="6. Your Choices and Rights">
        <p>
          You may have certain rights regarding your personal information, such
          as the right to access, correct, or delete the data we hold about you.
          You can often do this directly through your account settings. If you
          wish to exercise other data protection rights, please contact us at{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-primary hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Children's Privacy">
        <p>
          Our Service is not directed to children under the age of 13, and we do
          not knowingly collect personal information from children under 13. If
          we become aware that we have inadvertently received personal
          information from a user under the age of 13, we will delete such
          information from our records.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by posting the new Privacy Policy on this page and
          updating the &quot;Effective Date&quot; at the top. You are advised to
          review this Privacy Policy periodically for any changes.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact Us">
        <p>
          If you have any questions about this Privacy Policy, please contact us
          at:{" "}
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
