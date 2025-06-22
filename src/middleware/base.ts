import { IntentMiddleware } from "../types";

export function createMiddleware(
  id: string,
  execute: IntentMiddleware["execute"]
): IntentMiddleware {
  return { id, execute };
}
