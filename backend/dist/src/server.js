"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ytmusic_1 = require("./config/ytmusic");
const auth_1 = __importDefault(require("./routes/auth"));
const playlists_1 = __importDefault(require("./routes/playlists"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || ytmusic_1.googleConfig.port || 3001;
// Configure CORS allowed origins
const ALLOWED_ORIGINS = Array.from(new Set([
    ytmusic_1.googleConfig.frontendUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]));
app.use((0, cors_1.default)({
    origin: ALLOWED_ORIGINS,
    credentials: true,
}));
// Body parsing middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
});
// Register Routes
app.use('/auth', auth_1.default);
app.use('/api', playlists_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});
// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Global JSON error handler
app.use((err, req, res, next) => {
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
    console.log(`🔗 Frontend Allowed URL: ${ytmusic_1.googleConfig.frontendUrl}`);
    console.log(`=================================================`);
});
exports.default = app;
