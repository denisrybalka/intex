import {
  IntentContract,
  IntentFunction,
  IntentMiddleware,
} from "../types/core";
import { IntentContractBuilderInterface } from "../types/builders";

export class IntentContractBuilder<TContext = any>
  implements IntentContractBuilderInterface<TContext>
{
  constructor(private contract: Partial<IntentContract<TContext>>) {}

  withFunctions(
    ...functions: IntentFunction[]
  ): IntentContractBuilder<TContext> {
    this.contract.functions = [
      ...(this.contract.functions || []),
      ...functions,
    ];
    return this;
  }

  withMiddleware(
    ...middleware: IntentMiddleware[]
  ): IntentContractBuilder<TContext> {
    this.contract.middleware = [
      ...(this.contract.middleware || []),
      ...middleware,
    ];
    return this;
  }

  withFallback(
    behavior: "reject" | "askUser" | "delegate"
  ): IntentContractBuilder<TContext> {
    this.contract.fallbackBehavior = behavior;
    return this;
  }

  build(): IntentContract<TContext> {
    if (!this.contract.intent || !this.contract.functions) {
      throw new Error("Contract must have intent and functions");
    }

    return this.contract as IntentContract<TContext>;
  }
}
