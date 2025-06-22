import { createMiddleware, IntentMiddleware } from "../../src";

export interface AuthOptions {
  validateToken: (token: string) => Promise<boolean> | boolean;
  extractToken: (userMessage: string) => string | null;
  unauthorizedMessage?: string;
}

export function createAuthMiddleware(options: AuthOptions): IntentMiddleware {
  return createMiddleware("auth", async (intent, userMessage, context) => {
    const token = options.extractToken(userMessage);

    if (!token) {
      return {
        continue: false,
        modifiedContext: {
          id: "auth_error",
          data: {
            error: "No authentication token provided",
          },
          timestamp: new Date(),
        },
      };
    }

    const isValid = await options.validateToken(token);

    if (!isValid) {
      return {
        continue: false,
        modifiedContext: {
          id: "auth_error",
          data: {
            error: options.unauthorizedMessage || "Unauthorized access",
          },
          timestamp: new Date(),
        },
      };
    }

    return { continue: true };
  });
}
