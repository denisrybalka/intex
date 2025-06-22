import {
  BaseIntent,
  IntentContract,
  IntentContext,
  IntentFunction,
} from "./core";
import { IntentMiddleware } from "./middleware";

export interface IntentBuilderInterface {
  withId(id: string): IntentBuilderInterface;
  withName(name: string): IntentBuilderInterface;
  withDescription(description: string): IntentBuilderInterface;
  withPatterns(...patterns: string[]): IntentBuilderInterface;
  withExamples(...examples: string[]): IntentBuilderInterface;
  withPriority(priority: number): IntentBuilderInterface;
  withContext<T>(
    provider: () => Promise<IntentContext<T>> | IntentContext<T>
  ): IntentContractBuilderInterface<T>;
  withFunctions(...functions: IntentFunction[]): IntentContractBuilderInterface;
  build(): BaseIntent;
}

export interface IntentContractBuilderInterface<TContext = any> {
  withFunctions(
    ...functions: IntentFunction[]
  ): IntentContractBuilderInterface<TContext>;
  withMiddleware(
    ...middleware: IntentMiddleware[]
  ): IntentContractBuilderInterface<TContext>;
  build(): IntentContract<TContext>;
}
