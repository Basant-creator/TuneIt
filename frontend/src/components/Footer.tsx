import Link from 'next/link';
import { CONTACT_EMAIL, EXTERNAL } from '@/data/legal';

/**
 * Site footer. Google's OAuth review requires the home page to link to the
 * privacy policy, and YouTube's API policies require users to be pointed at
 * YouTube's Terms of Service.
 */
export function Footer() {
  return (
    <footer className="w-full border-t-3 border-black bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between font-mono text-xs font-bold">
        <p className="text-slate-600">© 2026 TuneIt · Uses YouTube API Services</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="underline underline-offset-4 hover:text-brand-pink">
            Privacy
          </Link>
          <Link href="/terms" className="underline underline-offset-4 hover:text-brand-pink">
            Terms
          </Link>
          <a
            href={EXTERNAL.youtubeTerms}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-brand-pink"
          >
            YouTube Terms
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4 hover:text-brand-pink">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
