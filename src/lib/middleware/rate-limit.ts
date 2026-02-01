import { NextRequest, NextResponse } from "next/server";

// In-memory rate limit store
// In production, consider using Redis or a database
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration per plan
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

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for an API key
 * @param apiKeyId - The API key ID
 * @param plan - User plan (pro or enterprise)
 * @param window - Time window in seconds (60 for minute, 3600 for hour, 86400 for day)
 * @param limit - Maximum requests in the window
 * @returns Object with allowed status and remaining requests
 */
function checkRateLimit(
  apiKeyId: string,
  plan: "pro" | "enterprise",
  window: number,
  limit: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const limits = RATE_LIMITS[plan];
  const key = `${apiKeyId}:${window}`;
  const now = Date.now();
  const resetTime = now + window * 1000;

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // New window or expired entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limit middleware for API requests
 * Checks per-minute, per-hour, and per-day limits
 */
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

  // Check per-minute limit
  const minuteCheck = checkRateLimit(apiKeyId, plan, 60, limits.requestsPerMinute);
  if (!minuteCheck.allowed) {
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

  // Check per-hour limit
  const hourCheck = checkRateLimit(apiKeyId, plan, 3600, limits.requestsPerHour);
  if (!hourCheck.allowed) {
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

  // Check per-day limit
  const dayCheck = checkRateLimit(apiKeyId, plan, 86400, limits.requestsPerDay);
  if (!dayCheck.allowed) {
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

  // All checks passed
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
