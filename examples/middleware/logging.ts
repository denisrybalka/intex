import { createMiddleware, IntentMiddleware } from "../../src";

export function createLoggingMiddleware(): IntentMiddleware {
  return createMiddleware("logging", async (intent, userMessage, context) => {
    console.log(
      `[${new Date().toISOString()}] Intent: ${
        intent.id
      }, Message: "${userMessage}"`
    );
    return { continue: true };
  });
}
