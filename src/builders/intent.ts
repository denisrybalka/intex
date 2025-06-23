import {
  BaseIntent,
  IntentContext,
  IntentFunction,
  IntentBuilderInterface,
} from "../types";
import { IntentContractBuilder } from "./contract";

export class IntentBuilder implements IntentBuilderInterface {
  private intent: Partial<BaseIntent> = {};

  withId(id: string): IntentBuilder {
    this.intent.id = id;
    return this;
  }

  withName(name: string): IntentBuilder {
    this.intent.name = name;
    return this;
  }

  withDescription(description: string): IntentBuilder {
    this.intent.description = description;
    return this;
  }

  withPatterns(...patterns: string[]): IntentBuilder {
    this.intent.patterns = [...(this.intent.patterns || []), ...patterns];
    return this;
  }

  withExamples(...examples: string[]): IntentBuilder {
    this.intent.examples = [...(this.intent.examples || []), ...examples];
    return this;
  }

  withContext<T>(
    provider: () => Promise<IntentContext<T>> | IntentContext<T>
  ): IntentContractBuilder<T> {
    const contract = {
      intent: this.build(),
      contextProvider: provider,
      functions: [],
      middleware: [],
    };
    return new IntentContractBuilder<T>(contract);
  }

  withFunctions(...functions: IntentFunction[]): IntentContractBuilder {
    const contract = {
      intent: this.build(),
      functions,
      middleware: [],
    };
    return new IntentContractBuilder(contract);
  }

  build(): BaseIntent {
    if (!this.intent.id || !this.intent.name || !this.intent.description) {
      throw new Error("Intent must have id, name, and description");
    }

    return {
      id: this.intent.id,
      name: this.intent.name,
      description: this.intent.description,
      patterns: this.intent.patterns || [],
      examples: this.intent.examples || [],
    };
  }
}

export function createIntent(): IntentBuilder {
  return new IntentBuilder();
}
