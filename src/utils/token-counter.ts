// Very simplified token estimator

import { ChatCompletionMessageParam } from "../types";

// For a production system, you would use a proper tokenizer like GPT-3 Tokenizer
export function estimateTokenCount(text: string): number {
  // Rough approximation - 1 token is about 4 chars for English text
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokenCount(
  messages: ChatCompletionMessageParam[]
): number {
  let total = 0;

  for (const message of messages) {
    // Base tokens per message (for role, format markers, etc)
    total += 4;

    // Content tokens
    if (typeof message.content === "string") {
      total += estimateTokenCount(message.content);
    }

    // Function call tokens - safely access tool_calls which may exist on ChatCompletionAssistantMessageParam
    const assistantMessage = message as any; // Type assertion for flexibility
    if (
      assistantMessage.tool_calls &&
      Array.isArray(assistantMessage.tool_calls)
    ) {
      // Each tool call has some overhead
      total += assistantMessage.tool_calls.length * 10;

      // Add tokens for each function call
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type === "function") {
          // Function name
          total += estimateTokenCount(toolCall.function.name);

          // Function arguments as JSON
          total += estimateTokenCount(toolCall.function.arguments);
        }
      }
    }
  }

  return total;
}

export function estimateFunctionTokenCount(
  functionName: string,
  description: string,
  parameters: any
): number {
  let total = 0;

  // Function name
  total += estimateTokenCount(functionName);

  // Description
  total += estimateTokenCount(description);

  // Parameters (JSON schema)
  total += estimateTokenCount(JSON.stringify(parameters));

  // Fixed overhead for function definition format
  total += 10;

  return total;
}
