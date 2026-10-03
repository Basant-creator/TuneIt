import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/LegalPage';
import { CONTACT_EMAIL, EXTERNAL, YOUTUBE_SCOPE } from '@/data/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What TuneIt does with your YouTube account and data, and what it never keeps.',
};

/**
 * Every statement here describes the code as it is. Before changing what the
 * app reads, stores or sends anywhere, update this page (and LEGAL_UPDATED).
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="TuneIt reorders the songs in your YouTube Music playlists so they flow better. It is built to keep as little about you as possible: no account, no password, no profile. This page says exactly what it touches, where that goes, and how long it lasts."
    >
      <Section title="Signing in with Google">
        <p>
          You sign in with your Google account. TuneIt asks Google for one permission, YouTube access (
          <code className="font-mono text-xs break-all">{YOUTUBE_SCOPE}</code>), and uses it only to:
        </p>
        <ul>
          <li>show your channel name and picture, so you can see which account is signed in;</li>
          <li>list your playlists, and read the tracks in a playlist you open;</li>
          <li>create a new playlist and add tracks to it, only when you click Create Playlist;</li>
          <li>search YouTube for similar songs, only when you open Recommendations.</li>
        </ul>
        <p>TuneIt never edits, reorders or deletes your existing playlists, and never posts, comments or subscribes on your behalf.</p>
      </Section>

      <Section title="How long sign-in lasts">
        <p>
          Sign-in is temporary. Google gives TuneIt a short-lived access token that expires after about an hour, and no
          refresh token, so TuneIt cannot use your account after that. The token is held only in the server&apos;s memory —
          never written to a disk or a database — and is discarded when it expires or when the server restarts.
        </p>
        <p>
          Signing out asks Google to revoke the token immediately. You can also remove TuneIt&apos;s access at any time from
          your Google account&apos;s{' '}
          <a href={EXTERNAL.googlePermissions} target="_blank" rel="noopener noreferrer">
            third-party connections page
          </a>
          .
        </p>
      </Section>

      <Section title="What is stored, and where">
        <ul>
          <li>
            <strong>A session cookie</strong> (<code className="font-mono text-xs">tuneit_sid</code>): a random identifier
            that links your browser to your sign-in for up to an hour. It holds nothing about you.
          </li>
          <li>
            <strong>Song analysis</strong>: the estimated tempo, energy, mood and musical key of songs, saved by artist and
            title so the same song is not analysed twice. It is shared by everyone and is not linked to you, your account
            or your playlists.
          </li>
          <li>
            <strong>A daily export count</strong>: to share YouTube&apos;s limited quota fairly, TuneIt counts playlists
            created per account per day, keyed by a one-way hash of your channel ID. It is kept in memory only and resets
            daily.
          </li>
          <li>
            <strong>Your arranged sequence, in your own browser</strong>: the order you arranged is kept in that browser
            tab&apos;s session storage so it survives signing in again. It never leaves your device and is gone when you
            close the tab.
          </li>
        </ul>
        <p>TuneIt has no user accounts, keeps no record of who used it, and stores no names, emails or playlists.</p>
      </Section>

      <Section title="Services TuneIt relies on">
        <ul>
          <li>
            <strong>YouTube API Services</strong> (Google), to read and create playlists. By using TuneIt you agree to the{' '}
            <a href={EXTERNAL.youtubeTerms} target="_blank" rel="noopener noreferrer">
              YouTube Terms of Service
            </a>
            , and Google&apos;s handling of your data is covered by the{' '}
            <a href={EXTERNAL.googlePrivacy} target="_blank" rel="noopener noreferrer">
              Google Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Google Gemini</strong>, to estimate each song&apos;s tempo and energy, and — when you open
            Recommendations — to suggest similar songs from a few songs in your playlist. It receives song titles, artist
            names and YouTube&apos;s descriptive tags — nothing that identifies you.
          </li>
          <li>
            <strong>Apple iTunes Search</strong>, for 15-second previews. Your browser asks Apple directly for a song by title
            and artist when you press play, so Apple sees that request and your IP address.
          </li>
          <li>
            <strong>Hosting</strong>: Vercel serves the website, Render runs the server and Neon hosts the song-analysis
            database. Their operational logs record requests (such as page addresses and IP addresses) and the names of
            playlists created, kept according to their own retention.
          </li>
        </ul>
        <p>TuneIt shows no ads, uses no analytics or tracking cookies, and does not sell or share your data.</p>
      </Section>

      <Section title="Your choices">
        <ul>
          <li>Sign out at any time; it revokes TuneIt&apos;s access straight away.</li>
          <li>
            Remove access from your{' '}
            <a href={EXTERNAL.googlePermissions} target="_blank" rel="noopener noreferrer">
              Google account
            </a>
            , whether or not you are signed in to TuneIt.
          </li>
          <li>
            Ask anything about your data at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </li>
        </ul>
      </Section>

      <Section title="Children">
        <p>
          TuneIt is not directed at children under 13, and anyone using it must meet YouTube&apos;s minimum age for their
          country.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If TuneIt starts handling data differently, this page will change first, with a new date at the top. Questions:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
