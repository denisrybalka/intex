import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { StorageExtension } from "../extensions";
import { IntentMiddleware } from "./middleware";

export type { ChatCompletionMessageParam, ChatCompletionTool };

export interface BaseIntent {
  id: string;
  name: string;
  description: string;
  priority?: number;
  patterns: string[];
  examples: string[];
}

export interface IntentContext<T = any> {
  id: string;
  data: T;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface IntentFunction<TParams = any, TReturn = any> {
  id: string;
  name: string;
  description: string;
  parameters: any;
  handler: (
    params: TParams,
    context?: IntentContext
  ) => Promise<TReturn> | TReturn;
  requiresContext?: boolean;
}

export interface IntentContract<TContext = any, TFunctionParams = any> {
  intent: BaseIntent;
  contextProvider?: () =>
    | Promise<IntentContext<TContext>>
    | IntentContext<TContext>;
  functions: IntentFunction<TFunctionParams>[];
  middleware?: IntentMiddleware[];
}

export interface IntentDetectionResult {
  intent: BaseIntent;
  confidence: number;
  extractedEntities?: Record<string, any>;
  matchedPattern?: string;
}

export interface IntentFrameworkConfig {
  openai: {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  intentDetection: {
    strategy: "pattern" | "embedding" | "llm" | "hybrid";
    confidenceThreshold?: number;
  };
  logging?:
    | {
        enabled: false;
      }
    | {
        enabled: true;
        level: "debug" | "info" | "warn" | "error";
      };
  storageExtension: StorageExtensionConfig;
}

export type StorageExtensionConfig = {
  instance: StorageExtension;
} | null;

export interface ExecutionContext {
  conversationId: string;
  userId?: string;
  userMessage: string;
  detectedIntent?: IntentDetectionResult;
  injectedContext?: IntentContext;
  functionCalls?: FunctionCall[];
  messages: ChatCompletionMessageParam[];
}

export interface FunctionCall {
  functionId: string;
  parameters: any;
  result?: any;
  error?: string;
  executionTime?: number;
}

export interface IntentFrameworkResponse {
  response: string;
  executionContext: ExecutionContext;
  metadata: {
    intentDetected: boolean;
    functionsExecuted: number;
    totalExecutionTime: number;
    confidence?: number;
  };
}
