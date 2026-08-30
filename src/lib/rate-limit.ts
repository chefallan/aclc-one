import { NextRequest, NextResponse } from "next/server";
import { RateLimiterRes } from "rate-limiter-flexible";
import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";

// Use memory-based rate limiter for production (Redis can be swapped in later)
const createLimiter = (keyPrefix: string, points: number, duration: number) => {
  return new RateLimiterMemory({
    keyPrefix,
    points,
    duration,
  });
};

// Rate limiters by endpoint type
export const limiters = {
  // Strict: auth endpoints (login, register)
  auth: createLimiter("auth", 5, 60 * 15), // 5 attempts per 15 minutes
  // Medium: API write endpoints
  apiWrite: createLimiter("api_write", 30, 60), // 30 requests per minute
  // Lenient: API read endpoints
  apiRead: createLimiter("api_read", 100, 60), // 100 requests per minute
  // Strict: AI generation
  ai: createLimiter("ai", 10, 60), // 10 AI requests per minute
  // Strict: AI Flashcard generation from notes (4 generations per 5 hours)
  aiFlashcards: createLimiter("ai_flashcards", 4, 5 * 60 * 60), // 4 generations per 5 hours
};

export async function rateLimit(
  req: NextRequest,
  limiter: ReturnType<typeof createLimiter>,
  identifier?: string
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const key = identifier || req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";

  try {
    const rateLimiterRes = await limiter.consume(key);
    return {
      allowed: true,
      headers: {
        "X-RateLimit-Limit": String(limiter.points),
        "X-RateLimit-Remaining": String(rateLimiterRes.remainingPoints),
        "X-RateLimit-Reset": String(
          Math.ceil(Date.now() / 1000) + rateLimiterRes.msBeforeNext / 1000
        ),
      },
    };
  } catch (rejRes) {
    const res = rejRes as RateLimiterRes;
    return {
      allowed: false,
      headers: {
        "X-RateLimit-Limit": String(limiter.points),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(
          Math.ceil(Date.now() / 1000) + res.msBeforeNext / 1000
        ),
        "Retry-After": String(Math.ceil(res.msBeforeNext / 1000)),
      },
    };
  }
}

export function rateLimitResponse(
  headers: Record<string, string>,
  requestId: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      requestId,
      error: "Too many requests. Please try again later.",
    },
    { status: 429, headers }
  );
}
