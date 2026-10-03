/**
 * Facts the privacy policy and terms state, kept in one place so the pages,
 * the footer and the tests agree. If what the app does with data changes,
 * change it here and in the policy text together, and move LEGAL_UPDATED.
 */

export const CONTACT_EMAIL = 'basantbhushan89@gmail.com';

/** Shown as "Last updated" on both pages. */
export const LEGAL_UPDATED = '3 October 2026';

/** Pages YouTube's API Services policies require the privacy policy to link to. */
export const EXTERNAL = {
  youtubeTerms: 'https://www.youtube.com/t/terms',
  googlePrivacy: 'https://policies.google.com/privacy',
  googlePermissions: 'https://myaccount.google.com/connections',
} as const;

/** The single Google permission TuneIt asks for. */
export const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube';
