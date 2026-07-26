"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
exports.googleConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:3001/auth/callback',
    frontendUrl: process.env.FRONTEND_URL || 'http://127.0.0.1:3000',
    port: parseInt(process.env.PORT || '3001', 10),
};
if (!exports.googleConfig.clientId || !exports.googleConfig.clientSecret) {
    console.warn(`[Config Warning] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in your .env file.`);
}
