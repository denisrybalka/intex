import {
  ChatCompletionTool,
  ExecutionContext,
  FunctionCall,
  IntentFunction,
} from "../types/core";

export function prepareFunctionTools(
  functions: IntentFunction[]
): ChatCompletionTool[] {
  return functions.map((func) => ({
    type: "function" as const,
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters,
    },
  }));
}

export async function executeFunctionCalls(
  toolCalls: any[],
  availableFunctions: IntentFunction[],
  executionContext: ExecutionContext,
  logger: (level: "debug" | "info" | "warn" | "error", message: string) => void
): Promise<void> {
  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const parameters = JSON.parse(toolCall.function.arguments);

    const func = availableFunctions.find((f) => f.name === functionName);
    if (!func) {
      logger("error", `Function ${functionName} not found`);
      continue;
    }

    const functionCallRecord: FunctionCall = {
      functionId: toolCall.id,
      parameters,
    };

    const startTime = Date.now();

    try {
      const context = func.requiresContext
        ? executionContext.injectedContext
        : undefined;
      functionCallRecord.result = await func.handler(parameters, context);
      functionCallRecord.executionTime = Date.now() - startTime;

      logger(
        "info",
        `Function ${functionName} executed successfully in ${functionCallRecord.executionTime}ms`
      );
    } catch (error) {
      functionCallRecord.error =
        error instanceof Error ? error.message : String(error);
      functionCallRecord.executionTime = Date.now() - startTime;

      logger(
        "error",
        `Function ${functionName} failed: ${functionCallRecord.error}`
      );
    }

    executionContext.functionCalls!.push(functionCallRecord);
  }
}
