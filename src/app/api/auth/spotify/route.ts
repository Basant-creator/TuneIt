import { NextRequest, NextResponse } from 'next/server';
import { SpotifyService } from '@/services/spotify';

/**
 * Spotify OAuth Callback Route
 * Handles authorization redirect, token extraction, and session cookie setup.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle Spotify-level rejects
  if (error) {
    console.error('[Spotify Auth API] Callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=spotify_auth_failed', request.url)
    );
  }

  // Handle missing parameters
  if (!code) {
    return NextResponse.json(
      { error: 'Missing authorization code' },
      { status: 400 }
    );
  }

  try {
    // 1. Exchange OAuth code for tokens
    const { accessToken, refreshToken, expiresIn } =
      await SpotifyService.exchangeCodeForToken(code);

    // 2. Initialize redirect to App Dashboard
    const redirectUrl = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(redirectUrl);

    // 3. Store tokens in secure HttpOnly cookies for SSR sessions
    response.cookies.set('spotify_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn,
      path: '/',
    });

    response.cookies.set('spotify_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[Spotify Auth API] Token exchange error:', err);
    return NextResponse.redirect(
      new URL('/?error=token_exchange_failed', request.url)
    );
  }
}
