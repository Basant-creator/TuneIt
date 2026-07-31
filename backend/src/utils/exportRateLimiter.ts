/**
 * In-memory Daily Export Rate Limiter.
 * Limits YouTube Music playlist exports to 3 per client IP / User per calendar day
 * to prevent YouTube Data API v3 write quota exhaustion.
 */

interface RateLimitRecord {
  count: number;
  dateKey: string;
}

const exportStore = new Map<string, RateLimitRecord>();

function getTodayKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
}

export function checkAndIncrementExportLimit(clientId: string, limit: number = 3): {
  allowed: boolean;
  currentCount: number;
  remaining: number;
} {
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
