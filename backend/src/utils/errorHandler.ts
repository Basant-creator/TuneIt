import { Response } from 'express';

/**
 * Centralized controller error handler for consistent API error responses and logging.
 *
 * @param res Express Response object
 * @param error Error object or message
 * @param context Log context message (e.g., "[YtMusicController] Error in getMe")
 * @param defaultStatus Default HTTP status code if unhandled (defaults to 500)
 */
export function handleControllerError(
  res: Response,
  error: any,
  context: string,
  defaultStatus = 500
): void {
  const errorMessage = error?.message || (typeof error === 'string' ? error : 'An unexpected error occurred');
  console.error(`${context}:`, errorMessage);

  // Google answers 401 once the (non-refreshable) access token has expired or
  // been revoked. Report that as signed out, not as a server error.
  const googleStatus = error?.response?.status ?? (typeof error?.code === 'number' ? error.code : undefined);
  const isUnauthorized =
    googleStatus === 401 ||
    errorMessage.includes('session') ||
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('unauthorized');

  const statusCode = error?.statusCode || (isUnauthorized ? 401 : defaultStatus);

  res.status(statusCode).json({
    error: googleStatus === 401 ? 'Your YouTube sign-in has ended. Please sign in again.' : errorMessage,
    ...(statusCode === 401 && { code: 'NOT_AUTHENTICATED' }),
    ...(error?.details && { details: error.details }),
  });
}
