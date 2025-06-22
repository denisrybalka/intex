import {
  ChatCompletionTool,
  ExecutionContext,
  FunctionCall,
  IntentFunction,
} from "../types/core";
import { PluginManager } from "../plugins/plugin-manager";

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
  const pluginManager = PluginManager.getInstance();

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

    // Before function execution hook
    await pluginManager.executeHook(
      "onBeforeFunctionExecution",
      executionContext,
      func.id,
      parameters
    );

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

      // After function execution hook - success case
      await pluginManager.executeHook(
        "onAfterFunctionExecution",
        executionContext,
        func.id,
        functionCallRecord.result
      );
    } catch (error) {
      functionCallRecord.error =
        error instanceof Error ? error.message : String(error);
      functionCallRecord.executionTime = Date.now() - startTime;

      logger(
        "error",
        `Function ${functionName} failed: ${functionCallRecord.error}`
      );

      // After function execution hook - error case
      await pluginManager.executeHook(
        "onAfterFunctionExecution",
        executionContext,
        func.id,
        null,
        functionCallRecord.error
      );
    }

    executionContext.functionCalls!.push(functionCallRecord);
  }
}
