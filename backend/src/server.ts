import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { googleConfig, validateConfig } from './config/ytmusic';
import authRoutes from './routes/auth';
import playlistRoutes from './routes/playlists';
import { attachSession } from './middleware/session';
import { activeSessionCount } from './services/sessionStore';
import prisma from './config/db';

validateConfig();

const app = express();
const PORT = googleConfig.port;

// Behind Render/Railway/Fly/nginx the client IP and protocol arrive in headers.
// Needed for correct `secure` cookies and for IP-based rate limiting.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Configure CORS allowed origins
const ALLOWED_ORIGINS = Array.from(
  new Set([
    googleConfig.frontendUrl,
    ...googleConfig.extraOrigins,
    ...(googleConfig.isProduction
      ? []
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ]),
  ])
);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin/server-to-server requests arrive without an Origin header.
      if (!origin || ALLOWED_ORIGINS.includes(origin.replace(/\/+$/, ''))) {
        return callback(null, true);
      }
      // Deny by omitting the CORS headers rather than throwing. The browser
      // blocks the response either way, and the server avoids a noisy 500.
      console.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Resolve the caller's YouTube session from the TuneIt cookie.
app.use(attachSession);

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

// Register Routes
app.use('/auth', authRoutes);
app.use('/api', playlistRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeSessions: activeSessionCount(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Readiness probe: verifies the database is actually reachable.
app.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected' });
  } catch (err: any) {
    res.status(503).json({
      status: 'not_ready',
      database: 'unreachable',
      error: err?.message || 'Database check failed',
    });
  }
});

// 404 handler for unmatched routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global JSON error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error Handler] Unhandled error:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(googleConfig.isProduction ? {} : { stack: err.stack }),
  });
});

/**
 * Binds the port only when this file is the entrypoint, so tests and scripts can
 * import the app without racing a real listener.
 */
export function startServer(port: number = PORT) {
  const server = app.listen(port, () => {
    console.log(`=================================================`);
    console.log(`🎵 TuneIt Backend Server listening on Port: ${port}`);
    console.log(`🔗 Local Address: http://127.0.0.1:${port}`);
    console.log(`🔗 Allowed Origins: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`🍪 Cross-site cookies: ${googleConfig.crossSiteCookies ? 'on' : 'off'}`);
    console.log(`=================================================`);
  });

  // Graceful shutdown so platform deploys don't cut in-flight requests.
  const shutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}, shutting down...`);
    server.close(async () => {
      await prisma.$disconnect().catch(() => undefined);
      process.exit(0);
    });
    // Hard stop if connections refuse to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

if (require.main === module) {
  startServer();
}

export default app;
