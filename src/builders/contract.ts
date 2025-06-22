import {
  IntentContract,
  IntentFunction,
  IntentMiddleware,
  IntentContractBuilderInterface,
} from "../types";

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

  build(): IntentContract<TContext> {
    if (!this.contract.intent || !this.contract.functions) {
      throw new Error("Contract must have intent and functions");
    }

    return this.contract as IntentContract<TContext>;
  }
}
