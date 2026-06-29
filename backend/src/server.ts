import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { spotifyConfig } from './config/spotify';
import authRoutes from './routes/auth';
import playlistRoutes from './routes/playlists';

const app = express();
const PORT = spotifyConfig.port;

// Configure CORS
app.use(
  cors({
    origin: [
      spotifyConfig.frontendUrl,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

// Register Routes
app.use('/auth', authRoutes);
app.use('/api', playlistRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 404 handler for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global JSON error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Server Error Handler] Unhandled error:', err);
  
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🎵 TuneIt Backend Server listening on Port: ${PORT}`);
  console.log(`🔗 Local Address: http://127.0.0.1:${PORT}`);
  console.log(`🔗 Frontend Allowed URL: ${spotifyConfig.frontendUrl}`);
  console.log(`=================================================`);
});
export default app;
