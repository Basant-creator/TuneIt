"use strict";
/**
 * In-memory Daily Export Rate Limiter.
 * Limits YouTube Music playlist exports to 3 per client IP / User per calendar day
 * to prevent YouTube Data API v3 write quota exhaustion.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndIncrementExportLimit = checkAndIncrementExportLimit;
const exportStore = new Map();
function getTodayKey() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
}
function checkAndIncrementExportLimit(clientId, limit = 3) {
    const today = getTodayKey();
    const record = exportStore.get(clientId);
    if (!record || record.dateKey !== today) {
        // New day or first export
        exportStore.set(clientId, { count: 1, dateKey: today });
        return { allowed: true, currentCount: 1, remaining: limit - 1 };
    }
    if (record.count >= limit) {
        return { allowed: false, currentCount: record.count, remaining: 0 };
    }
    record.count += 1;
    exportStore.set(clientId, record);
    return { allowed: true, currentCount: record.count, remaining: limit - record.count };
}
