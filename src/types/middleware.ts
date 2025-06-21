import { BaseIntent, IntentContext } from "./core";

export type MiddlewareExecuteResult = {
  continue: boolean;
  modifiedContext?: IntentContext;
};

export interface IntentMiddleware {
  id: string;
  execute: (
    intent: BaseIntent,
    userMessage: string,
    context?: IntentContext
  ) => Promise<MiddlewareExecuteResult>;
}
