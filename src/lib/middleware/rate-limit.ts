interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export const RATE_LIMITS = {
  pro: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
  },
  enterprise: {
    requestsPerMinute: 120,
    requestsPerHour: 5000,
    requestsPerDay: 50000,
  },
} as const;

const AUTH_FAIL_LIMITS = {
  perMinute: 5,
  perHour: 20,
};

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(
  key: string,
  window: number,
  limit: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const resetTime = now + window * 1000;
  const storeKey = `${key}:${window}`;

  const entry = rateLimitStore.get(storeKey);

  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(storeKey, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  rateLimitStore.set(storeKey, entry);

  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}

export async function rateLimitApiRequest(
  apiKeyId: string,
  plan: "pro" | "enterprise"
): Promise<{
  allowed: boolean;
  error?: string;
  status?: number;
  headers?: Record<string, string>;
}> {
  const limits = RATE_LIMITS[plan];

  const minuteCheck = checkRateLimit(apiKeyId, 60, limits.requestsPerMinute);
  if (!minuteCheck.allowed) {
    console.warn(`[rate-limit] Minute limit hit for key=${apiKeyId}`);
    return {
      allowed: false,
      error: "Rate limit exceeded. Too many requests per minute.",
      status: 429,
      headers: {
        "X-RateLimit-Limit": limits.requestsPerMinute.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": Math.ceil(minuteCheck.resetTime / 1000).toString(),
        "Retry-After": Math.ceil((minuteCheck.resetTime - Date.now()) / 1000).toString(),
      },
    };
  }

  const hourCheck = checkRateLimit(apiKeyId, 3600, limits.requestsPerHour);
  if (!hourCheck.allowed) {
    console.warn(`[rate-limit] Hour limit hit for key=${apiKeyId}`);
    return {
      allowed: false,
      error: "Rate limit exceeded. Too many requests per hour.",
      status: 429,
      headers: {
        "X-RateLimit-Limit": limits.requestsPerHour.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": Math.ceil(hourCheck.resetTime / 1000).toString(),
        "Retry-After": Math.ceil((hourCheck.resetTime - Date.now()) / 1000).toString(),
      },
    };
  }

  const dayCheck = checkRateLimit(apiKeyId, 86400, limits.requestsPerDay);
  if (!dayCheck.allowed) {
    console.warn(`[rate-limit] Day limit hit for key=${apiKeyId}`);
    return {
      allowed: false,
      error: "Rate limit exceeded. Too many requests per day.",
      status: 429,
      headers: {
        "X-RateLimit-Limit": limits.requestsPerDay.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": Math.ceil(dayCheck.resetTime / 1000).toString(),
        "Retry-After": Math.ceil((dayCheck.resetTime - Date.now()) / 1000).toString(),
      },
    };
  }

  return {
    allowed: true,
    headers: {
      "X-RateLimit-Limit-Minute": limits.requestsPerMinute.toString(),
      "X-RateLimit-Remaining-Minute": minuteCheck.remaining.toString(),
      "X-RateLimit-Limit-Hour": limits.requestsPerHour.toString(),
      "X-RateLimit-Remaining-Hour": hourCheck.remaining.toString(),
      "X-RateLimit-Limit-Day": limits.requestsPerDay.toString(),
      "X-RateLimit-Remaining-Day": dayCheck.remaining.toString(),
    },
  };
}

/**
 * Rate-limit failed authentication attempts, keyed by IP + identifier
 * to prevent lockout of users behind NAT.
 */
export function checkAuthRateLimit(
  ip: string,
  identifier: string
): { allowed: boolean; retryAfterSeconds?: number } {
  const compositeKey = `auth_fail:${ip}:${identifier}`;

  const minuteCheck = checkRateLimit(compositeKey, 60, AUTH_FAIL_LIMITS.perMinute);
  if (!minuteCheck.allowed) {
    const retryAfter = Math.ceil((minuteCheck.resetTime - Date.now()) / 1000);
    console.warn(`[rate-limit] Auth rate limit hit: ip=${ip}, id=${identifier}`);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  const hourCheck = checkRateLimit(compositeKey, 3600, AUTH_FAIL_LIMITS.perHour);
  if (!hourCheck.allowed) {
    const retryAfter = Math.ceil((hourCheck.resetTime - Date.now()) / 1000);
    console.warn(`[rate-limit] Auth hour limit hit: ip=${ip}, id=${identifier}`);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  return { allowed: true };
}

/**
 * Record a failed authentication attempt for rate limiting.
 */
export function recordAuthFailure(ip: string, identifier: string): void {
  const compositeKey = `auth_fail:${ip}:${identifier}`;
  checkRateLimit(compositeKey, 60, AUTH_FAIL_LIMITS.perMinute);
  checkRateLimit(compositeKey, 3600, AUTH_FAIL_LIMITS.perHour);
}
