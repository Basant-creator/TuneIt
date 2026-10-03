import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '@/components/LegalPage';
import { CONTACT_EMAIL, EXTERNAL } from '@/data/legal';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for using TuneIt.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms cover your use of TuneIt, a free tool that reorders the songs in your YouTube Music playlists. By using TuneIt you agree to them. If you don't, please don't use it."
    >
      <Section title="YouTube">
        <p>
          TuneIt uses YouTube API Services. By using TuneIt you also agree to the{' '}
          <a href={EXTERNAL.youtubeTerms} target="_blank" rel="noopener noreferrer">
            YouTube Terms of Service
          </a>
          , and Google&apos;s handling of your data is covered by the{' '}
          <a href={EXTERNAL.googlePrivacy} target="_blank" rel="noopener noreferrer">
            Google Privacy Policy
          </a>
          . TuneIt is not made, endorsed or sponsored by YouTube or Google.
        </p>
      </Section>

      <Section title="What TuneIt does">
        <p>
          TuneIt reads the playlists you choose, estimates each song&apos;s tempo and energy, and suggests a new order. It
          only changes anything on YouTube when you ask it to create a new playlist; it never edits or deletes your existing
          ones. How it handles your data is described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Section>

      <Section title="Estimates, not facts">
        <p>
          Tempo, energy, mood and key are estimated by an AI model from song titles and artists, not measured from the
          audio, and can be wrong. The suggested order is a suggestion: listen before you rely on it.
        </p>
      </Section>

      <Section title="Fair use and limits">
        <ul>
          <li>
            YouTube gives TuneIt a limited daily quota shared by everyone, so playlist creation is capped per account per
            day. Downloading a CSV has no limit.
          </li>
          <li>Sign-in lasts up to an hour; after that, sign in again.</li>
          <li>
            Don&apos;t use TuneIt to break YouTube&apos;s terms, to overload or probe the service, or to access an account
            that isn&apos;t yours.
          </li>
        </ul>
      </Section>

      <Section title="No warranty">
        <p>
          TuneIt is free and provided &quot;as is&quot;, without warranties of any kind. It may change, be unavailable, or
          stop at any time. To the extent the law allows, TuneIt is not liable for any loss arising from its use, including
          playlists it creates or fails to create.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          These terms may change; the date at the top shows the latest version, and continuing to use TuneIt means
          accepting it. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
