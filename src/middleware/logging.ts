import { createMiddleware } from "./base";
import { IntentMiddleware } from "../types/core";

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
