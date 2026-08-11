"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleControllerError = handleControllerError;
/**
 * Centralized controller error handler for consistent API error responses and logging.
 *
 * @param res Express Response object
 * @param error Error object or message
 * @param context Log context message (e.g., "[YtMusicController] Error in getMe")
 * @param defaultStatus Default HTTP status code if unhandled (defaults to 500)
 */
function handleControllerError(res, error, context, defaultStatus = 500) {
    const errorMessage = error?.message || (typeof error === 'string' ? error : 'An unexpected error occurred');
    console.error(`${context}:`, errorMessage);
    const isUnauthorized = errorMessage.includes('session') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('unauthorized');
    const statusCode = error?.statusCode || (isUnauthorized ? 401 : defaultStatus);
    res.status(statusCode).json({
        error: errorMessage,
        ...(error?.details && { details: error.details }),
    });
}
