/**
 * Utility functions
 */

/**
 * Structured logging
 */
export function logStructured(level, message, data = {}) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };

  // Redact sensitive fields
  if (log.TW_BEARER) log.TW_BEARER = '[REDACTED]';
  if (log.bearer) log.bearer = '[REDACTED]';

  console.log(JSON.stringify(log));
}

/**
 * Create health check response
 */
export async function createHealthCheck(env) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // Check KV availability
    const kvTest = await env.NEWS_KV.get('health:test');
    health.checks.kv = kvTest !== undefined ? 'ok' : 'degraded';

    // Check feed sources
    const feedCount = (env.DEFAULT_FEEDS || '').split(',').filter(Boolean).length;
    health.checks.feeds = feedCount > 0 ? 'ok' : 'error';
    health.checks.feedCount = feedCount;

    // Overall status
    const hasErrors = Object.values(health.checks).some(v => v === 'error');
    health.status = hasErrors ? 'unhealthy' : 'healthy';
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
  }

  return health;
}

/**
 * Rate limiter using KV
 */
export async function checkRateLimit(key, limit, windowSeconds, env) {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;

  try {
    const count = await env.NEWS_KV.get(windowKey);
    const current = count ? parseInt(count) : 0;

    if (current >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await env.NEWS_KV.put(windowKey, String(current + 1), { expirationTtl: windowSeconds * 2 });

    return { allowed: true, remaining: limit - current - 1 };
  } catch {
    // Fail open on errors
    return { allowed: true, remaining: limit };
  }
}
