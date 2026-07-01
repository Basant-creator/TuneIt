# Deployment & OAuth Guidelines - TuneIt

Whenever preparing to deploy or refactoring the deployment pipeline of TuneIt, ensure the following requirements are met to prevent OAuth failures, session drops, and server crashes:

## 1. Production OAuth Redirect URIs
* **Google Cloud Console**: Update the OAuth client configuration by adding the production callback endpoint (e.g., `https://api.tuneit.com/auth/callback`) to the **Authorized redirect URIs**.
* **Spotify Developer Dashboard**: Add the production Spotify redirect URI (e.g., `https://api.tuneit.com/auth/spotify/callback`) to the dashboard settings.
* **Environment Variables**: In production, ensure the `.env` variables point to the live domains:
  ```env
  FRONTEND_URL=https://tuneit.com
  GOOGLE_REDIRECT_URI=https://api.tuneit.com/auth/callback
  SPOTIFY_REDIRECT_URI=https://api.tuneit.com/auth/spotify/callback
  ```

## 2. Google OAuth Consent Screen Publishing Status
* **Requirement**: The publishing status of the Google OAuth consent screen must be manually shifted from **"Testing"** to **"In Production"** in the Google Cloud Console.
* **Why**: Google limits the lifespan of refresh tokens to **7 days** while an app is in "Testing" mode. Transitioning to "In Production" removes this limit, ensuring your users do not get suddenly logged out.

## 3. Session Token Persistence (Moving Away from In-Memory Storage)
* **Current State**: Tokens for both Spotify and Google are currently stored in-memory (singleton service instances). 
* **Production Constraint**: If deployed to serverless environments (like Vercel, AWS Lambda) or platforms with periodic dyno/container restarts (like Render, Heroku), **in-memory tokens will be wiped out on every container spin-up or restart**.
* **Remedy**: Before public launch, integrate a database session store (e.g., Redis, MongoDB, or PostgreSQL) or client-side secure encrypted session cookies to store and read the active `access_token` and `refresh_token`.

## 4. Port and Host Binding
* **Requirement**: Let the hosting provider dynamically assign the PORT.
* **Why**: Services like Render or Heroku bind a random port to `process.env.PORT` on startup. The server must load this dynamically:
  ```typescript
  const PORT = process.env.PORT || 3001;
  ```
