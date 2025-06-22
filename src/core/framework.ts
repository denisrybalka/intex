import OpenAI from "openai";
import {
  BaseIntent,
  ChatCompletionMessageParam,
  ExecutionContext,
  IntentContract,
  IntentContext,
  IntentDetectionResult,
  IntentFrameworkConfig,
  IntentFrameworkResponse,
  Plugin,
} from "../types";

import { detectIntentByPattern, detectIntentByLLM } from "./detection";
import { prepareFunctionTools, executeFunctionCalls } from "./execution";
import { StorageManager } from "../extensions";
import { PluginManager } from "../plugins";

export class IntentFramework {
  private openai: OpenAI;
  private config: IntentFrameworkConfig;
  private contracts: Map<string, IntentContract> = new Map();
  private storageManager: StorageManager;
  private pluginManager: PluginManager;

  constructor(config: IntentFrameworkConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    this.storageManager = new StorageManager(
      config.storageExtension,
      this.log.bind(this)
    );
    // Initialize storage
    this.storageManager.initialize();

    // Get plugin manager instance
    this.pluginManager = PluginManager.getInstance();
  }

  registerContract(contract: IntentContract): void {
    this.contracts.set(contract.intent.id, contract);
    this.log("info", `Registered intent contract: ${contract.intent.id}`);
  }

  registerPlugin(plugin: Plugin): void {
    this.pluginManager.registerPlugin(plugin);
    this.log("info", `Registered plugin: ${plugin.id}`);
  }

  registerContracts(contracts: IntentContract[]): void {
    contracts.forEach((contract) => this.registerContract(contract));
  }

  getContracts(): IntentContract[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Shutdown the framework and all plugins
   */
  async shutdown(): Promise<void> {
    // Shutdown all plugins
    await this.pluginManager.shutdown();

    // Shutdown storage manager
    this.storageManager.shutdown();

    this.log("info", "Framework shutdown complete");
  }

  async process(
    userMessage: string,
    conversationId: string,
    userId?: string
  ): Promise<IntentFrameworkResponse> {
    const startTime = Date.now();

    const executionContext: ExecutionContext = {
      conversationId,
      userId,
      userMessage,
      functionCalls: [],
      messages:
        await this.storageManager.getConversationHistory(conversationId),
    };

    try {
      executionContext.messages.push({
        role: "user",
        content: userMessage,
      });

      // Before intent detection plugin hook
      await this.pluginManager.executeHook(
        "onBeforeIntentDetection",
        executionContext
      );

      // Detect intent
      const detectionResult = await this.detectIntent(userMessage);
      executionContext.detectedIntent = detectionResult ?? undefined;

      // After intent detection plugin hook
      await this.pluginManager.executeHook(
        "onAfterIntentDetection",
        executionContext
      );

      if (!detectionResult) {
        return this.createFallbackResponse(executionContext, startTime);
      }

      // Get contract and prepare context
      const contract = this.contracts.get(detectionResult.intent.id);
      if (!contract) {
        throw new Error(
          `No contract found for intent: ${detectionResult.intent.id}`
        );
      }

      // Execute middleware
      if (contract.middleware && contract.middleware.length > 0) {
        for (const middleware of contract.middleware) {
          const result = await middleware.execute(
            detectionResult.intent,
            userMessage,
            executionContext.injectedContext
          );

          if (!result.continue) {
            return this.createMiddlewareStoppedResponse(
              executionContext,
              startTime
            );
          }

          if (result.modifiedContext) {
            executionContext.injectedContext = result.modifiedContext;
          }
        }
      }

      // Before context injection plugin hook
      await this.pluginManager.executeHook(
        "onBeforeContextInjection",
        executionContext
      );

      // Provide context
      if (contract.contextProvider && !executionContext.injectedContext) {
        try {
          executionContext.injectedContext = await contract.contextProvider();
        } catch (error) {
          this.log(
            "error",
            `Failed to provide context for intent ${detectionResult.intent.id}`
          );
        }
      }

      // After context injection plugin hook
      await this.pluginManager.executeHook(
        "onAfterContextInjection",
        executionContext
      );

      // Prepare functions for OpenAI
      const tools = prepareFunctionTools(contract.functions);

      // Call OpenAI with function calling
      const chatResponse = await this.callOpenAIWithFunctions(
        executionContext.messages,
        tools,
        detectionResult.intent
      );

      // Execute function calls if any
      if (chatResponse.tool_calls && chatResponse.tool_calls.length > 0) {
        // Execute the functions with plugin hooks handled inside
        await executeFunctionCalls(
          chatResponse.tool_calls,
          contract.functions,
          executionContext,
          this.log.bind(this)
        );

        executionContext.messages.push(chatResponse);

        // Add function results to messages
        for (const functionCall of executionContext.functionCalls!) {
          executionContext.messages.push({
            role: "tool",
            tool_call_id: functionCall.functionId,
            content: JSON.stringify(functionCall.result || functionCall.error),
          });
        }

        // Before response generation hook
        await this.pluginManager.executeHook(
          "onBeforeResponseGeneration",
          executionContext
        );

        // Get final response
        const finalResponse = await this.openai.chat.completions.create({
          model: this.config.openai.model || "gpt-4",
          messages: executionContext.messages,
          temperature: this.config.openai.temperature || 0.7,
        });

        const finalMessage = finalResponse.choices[0].message;
        executionContext.messages.push(finalMessage);

        await this.storageManager.updateConversationHistory(
          conversationId,
          executionContext.messages
        );

        const response = {
          response: finalMessage.content || "Function executed successfully.",
          executionContext,
          metadata: {
            intentDetected: true,
            functionsExecuted: executionContext.functionCalls?.length || 0,
            totalExecutionTime: Date.now() - startTime,
            confidence: detectionResult.confidence,
          },
        };

        // After response generation hook
        await this.pluginManager.executeHook(
          "onAfterResponseGeneration",
          executionContext,
          response
        );

        return response;
      } else {
        // No tool calls, just a regular message
        executionContext.messages.push(chatResponse);

        // Before response generation hook
        await this.pluginManager.executeHook(
          "onBeforeResponseGeneration",
          executionContext
        );

        await this.storageManager.updateConversationHistory(
          conversationId,
          executionContext.messages
        );

        const response = {
          response: chatResponse.content || "No response generated.",
          executionContext,
          metadata: {
            intentDetected: true,
            functionsExecuted: 0,
            totalExecutionTime: Date.now() - startTime,
            confidence: detectionResult.confidence,
          },
        };

        // After response generation hook
        await this.pluginManager.executeHook(
          "onAfterResponseGeneration",
          executionContext,
          response
        );

        return response;
      }
    } catch (error) {
      this.log("error", `Error processing message: ${error}`);

      // Call error hook for plugins
      await this.pluginManager.executeHook(
        "onError",
        error as Error,
        executionContext
      );

      return {
        response:
          "I encountered an error while processing your request. Please try again.",
        executionContext,
        metadata: {
          intentDetected: !!executionContext.detectedIntent,
          functionsExecuted: executionContext.functionCalls?.length || 0,
          totalExecutionTime: Date.now() - startTime,
          confidence: executionContext.detectedIntent?.confidence,
        },
      };
    }
  }

  private async detectIntent(
    userMessage: string
  ): Promise<IntentDetectionResult | null> {
    const strategy = this.config.intentDetection.strategy;
    const intents = this.getContracts().map((contract) => contract.intent);

    switch (strategy) {
      case "pattern":
        return detectIntentByPattern(
          userMessage,
          intents,
          this.config.intentDetection.confidenceThreshold
        );
      case "llm":
        return detectIntentByLLM(
          userMessage,
          intents,
          this.openai,
          this.config
        );
      case "hybrid":
        const patternResult = await detectIntentByPattern(
          userMessage,
          intents,
          this.config.intentDetection.confidenceThreshold
        );

        if (
          patternResult &&
          patternResult.confidence >=
            (this.config.intentDetection.confidenceThreshold || 0.7)
        ) {
          return patternResult;
        }
        return detectIntentByLLM(
          userMessage,
          intents,
          this.openai,
          this.config
        );
      default:
        return detectIntentByPattern(
          userMessage,
          intents,
          this.config.intentDetection.confidenceThreshold
        );
    }
  }

  private async callOpenAIWithFunctions(
    messages: ChatCompletionMessageParam[],
    tools: any[],
    intent: BaseIntent
  ) {
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: `You are handling the "${intent.name}" intent. ${intent.description}. Use the available functions when appropriate to fulfill the user's request.`,
    };

    const response = await this.openai.chat.completions.create({
      model: this.config.openai.model || "gpt-4",
      messages: [systemMessage, ...messages],
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      temperature: this.config.openai.temperature || 0.7,
      max_tokens: this.config.openai.maxTokens,
    });

    return response.choices[0].message;
  }

  async clearConversationHistory(conversationId: string): Promise<void> {
    await this.storageManager.clearConversationHistory(conversationId);
  }

  private createFallbackResponse(
    executionContext: ExecutionContext,
    startTime: number
  ): IntentFrameworkResponse {
    return {
      response:
        "I'm not sure how to help with that. Could you please rephrase your request?",
      executionContext,
      metadata: {
        intentDetected: false,
        functionsExecuted: 0,
        totalExecutionTime: Date.now() - startTime,
      },
    };
  }

  private createMiddlewareStoppedResponse(
    executionContext: ExecutionContext,
    startTime: number
  ): IntentFrameworkResponse {
    return {
      response: "Your request was processed but stopped by a validation rule.",
      executionContext,
      metadata: {
        intentDetected: true,
        functionsExecuted: 0,
        totalExecutionTime: Date.now() - startTime,
      },
    };
  }

  log(level: "debug" | "info" | "warn" | "error", message: string): void {
    if (!this.config.logging?.enabled) return;

    const configLevel = this.config.logging.level || "info";
    const levels = ["debug", "info", "warn", "error"];

    if (levels.indexOf(level) >= levels.indexOf(configLevel)) {
      console[level](`[IntentFramework] ${message}`);
    }
  }

  async destroy(): Promise<void> {
    this.contracts.clear();
    await this.storageManager.shutdown();
  }
}
