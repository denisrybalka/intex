import { BaseIntent, IntentContext, IntentMiddleware } from "../types/core";
import { MiddlewareExecuteResult } from "../types/middleware";

export function createMiddleware(
  id: string,
  execute: IntentMiddleware["execute"]
): IntentMiddleware {
  return { id, execute };
}
