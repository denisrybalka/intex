import { createMiddleware, IntentMiddleware } from "../../src";

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (userMessage: string, context?: any) => string;
  message?: string;
}

export function createRateLimitMiddleware(
  options: RateLimitOptions
): IntentMiddleware {
  const requests = new Map<string, number[]>();

  return createMiddleware(
    "rate-limit",
    async (intent, userMessage, context) => {
      const key = options.keyGenerator
        ? options.keyGenerator(userMessage, context)
        : context?.data?.userId || "default";

      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Get existing requests or create new array
      const userRequests = requests.get(key) || [];

      // Filter out requests outside the time window
      const recentRequests = userRequests.filter(
        (timestamp) => timestamp > windowStart
      );

      // Check if user has exceeded the rate limit
      if (recentRequests.length >= options.maxRequests) {
        return {
          continue: false,
          modifiedContext: {
            id: "rate_limit_error",
            data: {
              error:
                options.message ||
                "Rate limit exceeded. Please try again later.",
            },
            timestamp: new Date(),
          },
        };
      }

      // Add current request to the list
      recentRequests.push(now);
      requests.set(key, recentRequests);

      return { continue: true };
    }
  );
}
