// Complete OpenAI Intent Framework - Single File Implementation
// Run with: npx ts-node intent-framework.ts

import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

// ============================================================================
// Types
// ============================================================================

interface BaseIntent {
  id: string;
  name: string;
  description: string;
  priority?: number;
  patterns: string[];
  examples: string[];
}

interface IntentContext<T = any> {
  id: string;
  data: T;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

interface IntentFunction<TParams = any, TReturn = any> {
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

interface IntentContract<TContext = any, TFunctionParams = any> {
  intent: BaseIntent;
  contextProvider?: () =>
    | Promise<IntentContext<TContext>>
    | IntentContext<TContext>;
  functions: IntentFunction<TFunctionParams>[];
  middleware?: IntentMiddleware[];
  fallbackBehavior?: "reject" | "askUser" | "delegate";
}

interface IntentMiddleware {
  id: string;
  execute: (
    intent: BaseIntent,
    userMessage: string,
    context?: IntentContext
  ) => Promise<{ continue: boolean; modifiedContext?: IntentContext }>;
}

interface IntentDetectionResult {
  intent: BaseIntent;
  confidence: number;
  extractedEntities?: Record<string, any>;
  matchedPattern?: string;
}

interface IntentFrameworkConfig {
  openai: {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  intentDetection: {
    strategy: "pattern" | "embedding" | "llm" | "hybrid";
    confidenceThreshold?: number;
    fallbackToLLM?: boolean;
  };
  logging?: {
    enabled: boolean;
    level: "debug" | "info" | "warn" | "error";
  };
  contextRetention?: {
    enabled: boolean;
    maxContexts?: number;
    ttl?: number;
  };
}

interface ExecutionContext {
  conversationId: string;
  userId?: string;
  userMessage: string;
  detectedIntent?: IntentDetectionResult;
  injectedContext?: IntentContext;
  functionCalls?: FunctionCall[];
  messages: ChatCompletionMessageParam[];
}

interface FunctionCall {
  functionId: string;
  parameters: any;
  result?: any;
  error?: string;
  executionTime?: number;
}

interface IntentFrameworkResponse {
  response: string;
  executionContext: ExecutionContext;
  metadata: {
    intentDetected: boolean;
    functionsExecuted: number;
    totalExecutionTime: number;
    confidence?: number;
  };
}

// ============================================================================
// Core Framework
// ============================================================================

class IntentFramework {
  private openai: OpenAI;
  private config: IntentFrameworkConfig;
  private contracts: Map<string, IntentContract> = new Map();
  private contextStore: Map<string, IntentContext[]> = new Map();
  private conversationHistory: Map<string, ChatCompletionMessageParam[]> =
    new Map();

  constructor(config: IntentFrameworkConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  registerContract(contract: IntentContract): void {
    this.contracts.set(contract.intent.id, contract);
    this.log("info", `Registered intent contract: ${contract.intent.id}`);
  }

  registerContracts(contracts: IntentContract[]): void {
    contracts.forEach((contract) => this.registerContract(contract));
  }

  getContracts(): IntentContract[] {
    return Array.from(this.contracts.values());
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
      messages: this.getConversationHistory(conversationId),
    };

    try {
      executionContext.messages.push({
        role: "user",
        content: userMessage,
      });

      // Detect intent
      const detectionResult = await this.detectIntent(userMessage);
      executionContext.detectedIntent = detectionResult || undefined;

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

      // Provide context
      if (contract.contextProvider && !executionContext.injectedContext) {
        try {
          executionContext.injectedContext = await contract.contextProvider();
          this.storeContext(conversationId, executionContext.injectedContext);
        } catch (error) {
          this.log(
            "error",
            `Failed to provide context for intent ${detectionResult.intent.id}`
          );
        }
      }

      // Prepare functions for OpenAI
      const tools = this.prepareFunctionTools(contract.functions);

      // Call OpenAI with function calling
      const response = await this.callOpenAIWithFunctions(
        executionContext.messages,
        tools,
        detectionResult.intent
      );

      // Execute function calls if any
      if (response.tool_calls && response.tool_calls.length > 0) {
        await this.executeFunctionCalls(
          response.tool_calls,
          contract.functions,
          executionContext
        );

        executionContext.messages.push(response);

        // Add function results to messages
        for (const functionCall of executionContext.functionCalls!) {
          executionContext.messages.push({
            role: "tool",
            tool_call_id: functionCall.functionId,
            content: JSON.stringify(functionCall.result || functionCall.error),
          });
        }

        // Get final response
        const finalResponse = await this.openai.chat.completions.create({
          model: this.config.openai.model || "gpt-4",
          messages: executionContext.messages,
          temperature: this.config.openai.temperature || 0.7,
        });

        const finalMessage = finalResponse.choices[0].message;
        executionContext.messages.push(finalMessage);

        this.updateConversationHistory(
          conversationId,
          executionContext.messages
        );

        return {
          response: finalMessage.content || "Function executed successfully.",
          executionContext,
          metadata: {
            intentDetected: true,
            functionsExecuted: executionContext.functionCalls?.length || 0,
            totalExecutionTime: Date.now() - startTime,
            confidence: detectionResult.confidence,
          },
        };
      } else {
        executionContext.messages.push(response);
        this.updateConversationHistory(
          conversationId,
          executionContext.messages
        );

        return {
          response: response.content || "No response generated.",
          executionContext,
          metadata: {
            intentDetected: true,
            functionsExecuted: 0,
            totalExecutionTime: Date.now() - startTime,
            confidence: detectionResult.confidence,
          },
        };
      }
    } catch (error) {
      this.log("error", `Error processing message: ${error}`);

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

    switch (strategy) {
      case "pattern":
        return this.detectIntentByPattern(userMessage);
      case "llm":
        return this.detectIntentByLLM(userMessage);
      case "hybrid":
        const patternResult = await this.detectIntentByPattern(userMessage);
        if (
          patternResult &&
          patternResult.confidence >=
            (this.config.intentDetection.confidenceThreshold || 0.7)
        ) {
          return patternResult;
        }
        return this.detectIntentByLLM(userMessage);
      default:
        return this.detectIntentByPattern(userMessage);
    }
  }

  private async detectIntentByPattern(
    userMessage: string
  ): Promise<IntentDetectionResult | null> {
    const lowerMessage = userMessage.toLowerCase();
    let bestMatch: IntentDetectionResult | null = null;
    let highestScore = 0;

    for (const contract of this.contracts.values()) {
      for (const pattern of contract.intent.patterns) {
        const regex = new RegExp(pattern, "i");
        if (regex.test(userMessage)) {
          const score = pattern.length / userMessage.length;
          if (score > highestScore) {
            highestScore = score;
            bestMatch = {
              intent: contract.intent,
              confidence: Math.min(score * 2, 1),
              matchedPattern: pattern,
            };
          }
        }
      }
    }

    const threshold = this.config.intentDetection.confidenceThreshold || 0.3;
    return bestMatch && bestMatch.confidence >= threshold ? bestMatch : null;
  }

  private async detectIntentByLLM(
    userMessage: string
  ): Promise<IntentDetectionResult | null> {
    const intents = Array.from(this.contracts.values()).map((contract) => ({
      id: contract.intent.id,
      name: contract.intent.name,
      description: contract.intent.description,
      examples: contract.intent.examples,
    }));

    const prompt = `
You are an intent classification system. Given a user message and a list of possible intents, determine which intent best matches the user's message.

User message: "${userMessage}"

Available intents:
${intents
  .map(
    (intent) => `
- ID: ${intent.id}
- Name: ${intent.name}
- Description: ${intent.description}
- Examples: ${intent.examples.join(", ")}
`
  )
  .join("\n")}

Respond with a JSON object containing:
- intentId: the ID of the best matching intent (or null if no good match)
- confidence: a number between 0 and 1 indicating confidence
- reasoning: brief explanation of why this intent was chosen

If no intent matches well (confidence < 0.5), return intentId as null.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model || "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      if (
        result.intentId &&
        result.confidence >=
          (this.config.intentDetection.confidenceThreshold || 0.5)
      ) {
        const contract = this.contracts.get(result.intentId);
        if (contract) {
          return {
            intent: contract.intent,
            confidence: result.confidence,
            matchedPattern: "LLM-based detection",
          };
        }
      }

      return null;
    } catch (error) {
      this.log("error", `LLM intent detection failed: ${error}`);
      return null;
    }
  }

  private prepareFunctionTools(
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

  private async callOpenAIWithFunctions(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
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

  private async executeFunctionCalls(
    toolCalls: any[],
    availableFunctions: IntentFunction[],
    executionContext: ExecutionContext
  ): Promise<void> {
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const parameters = JSON.parse(toolCall.function.arguments);

      const func = availableFunctions.find((f) => f.name === functionName);
      if (!func) {
        this.log("error", `Function ${functionName} not found`);
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

        this.log(
          "info",
          `Function ${functionName} executed successfully in ${functionCallRecord.executionTime}ms`
        );
      } catch (error) {
        functionCallRecord.error =
          error instanceof Error ? error.message : String(error);
        functionCallRecord.executionTime = Date.now() - startTime;

        this.log(
          "error",
          `Function ${functionName} failed: ${functionCallRecord.error}`
        );
      }

      executionContext.functionCalls!.push(functionCallRecord);
    }
  }

  private storeContext(conversationId: string, context: IntentContext): void {
    if (!this.config.contextRetention?.enabled) return;

    const contexts = this.contextStore.get(conversationId) || [];
    contexts.push(context);

    const maxContexts = this.config.contextRetention.maxContexts || 10;
    if (contexts.length > maxContexts) {
      contexts.splice(0, contexts.length - maxContexts);
    }

    this.contextStore.set(conversationId, contexts);
  }

  private getConversationHistory(
    conversationId: string
  ): ChatCompletionMessageParam[] {
    return this.conversationHistory.get(conversationId) || [];
  }

  private updateConversationHistory(
    conversationId: string,
    messages: ChatCompletionMessageParam[]
  ): void {
    this.conversationHistory.set(conversationId, [...messages]);
  }

  clearConversationHistory(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
    this.contextStore.delete(conversationId);
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

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string
  ): void {
    if (!this.config.logging?.enabled) return;

    const configLevel = this.config.logging.level || "info";
    const levels = ["debug", "info", "warn", "error"];

    if (levels.indexOf(level) >= levels.indexOf(configLevel)) {
      console[level](`[IntentFramework] ${message}`);
    }
  }

  async destroy(): Promise<void> {
    this.contracts.clear();
    this.contextStore.clear();
    this.conversationHistory.clear();
  }
}

// ============================================================================
// Builder Functions
// ============================================================================

class IntentBuilder {
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

  withPriority(priority: number): IntentBuilder {
    this.intent.priority = priority;
    return this;
  }

  withContext<T>(
    provider: () => Promise<IntentContext<T>> | IntentContext<T>
  ): IntentContractBuilder<T> {
    const contract: Partial<IntentContract<T>> = {
      intent: this.build(),
      contextProvider: provider,
      functions: [],
      middleware: [],
    };
    return new IntentContractBuilder(contract);
  }

  withFunctions(...functions: IntentFunction[]): IntentContractBuilder {
    const contract: Partial<IntentContract> = {
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
      priority: this.intent.priority || 0,
      patterns: this.intent.patterns || [],
      examples: this.intent.examples || [],
    };
  }
}

class IntentContractBuilder<TContext = any> {
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

function createIntent(): IntentBuilder {
  return new IntentBuilder();
}

function createFunction<TParams = any, TReturn = any>(
  definition: Omit<IntentFunction<TParams, TReturn>, "id"> & { id?: string }
): IntentFunction<TParams, TReturn> {
  return {
    id: definition.id || definition.name,
    ...definition,
  };
}

function createContextProvider<T>(
  provider: () => Promise<T> | T,
  metadata?: Record<string, any>
): () => Promise<IntentContext<T>> {
  return async () => {
    const data = await provider();
    return {
      id: `context_${Date.now()}`,
      data,
      metadata,
      timestamp: new Date(),
    };
  };
}

function createMiddleware(
  id: string,
  execute: IntentMiddleware["execute"]
): IntentMiddleware {
  return { id, execute };
}

function createLoggingMiddleware(): IntentMiddleware {
  return createMiddleware("logging", async (intent, userMessage, context) => {
    console.log(
      `[${new Date().toISOString()}] Intent: ${
        intent.id
      }, Message: "${userMessage}"`
    );
    return { continue: true };
  });
}

// ============================================================================
// Example Implementation
// ============================================================================

async function runExample() {
  console.log("🚀 Starting Intent Framework Demo...\n");

  // Configuration
  const config: IntentFrameworkConfig = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key-here",
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 1000,
    },
    intentDetection: {
      strategy: "hybrid",
      confidenceThreshold: 0.6,
      fallbackToLLM: true,
    },
    logging: {
      enabled: true,
      level: "info",
    },
    contextRetention: {
      enabled: true,
      maxContexts: 5,
      ttl: 300000,
    },
  };

  // Create framework
  const framework = new IntentFramework(config);

  // Example functions
  const getWeatherFunction = createFunction<
    { location: string },
    { temperature: number; description: string; location: string }
  >({
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City name or location",
        },
      },
      required: ["location"],
    },
    handler: async (params) => {
      // Simulate weather API call
      const temperatures = { "new york": 22, london: 15, tokyo: 28, paris: 18 };
      const descriptions = ["Sunny", "Partly cloudy", "Rainy", "Clear"];

      const temp =
        temperatures[params.location.toLowerCase()] ||
        Math.floor(Math.random() * 30);
      const desc =
        descriptions[Math.floor(Math.random() * descriptions.length)];

      return {
        temperature: temp,
        description: desc,
        location: params.location,
      };
    },
  });

  const calculateFunction = createFunction<
    { expression: string },
    { result: number; expression: string }
  >({
    name: "calculate",
    description: "Perform basic mathematical calculations",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description:
            'Mathematical expression to evaluate (e.g., "2 + 3 * 4")',
        },
      },
      required: ["expression"],
    },
    handler: async (params) => {
      try {
        // Simple math evaluation (in production, use a safe math parser)
        const result = eval(params.expression.replace(/[^0-9+\-*/().\s]/g, ""));
        return {
          result: Number(result),
          expression: params.expression,
        };
      } catch (error) {
        throw new Error(
          `Invalid mathematical expression: ${params.expression}`
        );
      }
    },
  });

  // Create intents
  const weatherContract = createIntent()
    .withId("weather")
    .withName("Weather Information")
    .withDescription("Get weather information for locations")
    .withPatterns(
      "weather.*in.*",
      "what.*is.*the.*weather",
      "temperature.*in.*",
      "how.*is.*the.*weather"
    )
    .withExamples(
      "What is the weather in London?",
      "Show me weather in New York",
      "Temperature in Tokyo",
      "How is the weather in Paris?"
    )
    .withFunctions(getWeatherFunction)
    .withMiddleware(createLoggingMiddleware())
    .build();

  const mathContract = createIntent()
    .withId("math")
    .withName("Mathematical Calculations")
    .withDescription("Perform mathematical calculations and computations")
    .withPatterns(
      "calculate.*",
      "what.*is.*\\d+.*[+\\-*/].*\\d+",
      "solve.*math",
      "\\d+.*[+\\-*/].*\\d+"
    )
    .withExamples(
      "Calculate 25 * 4",
      "What is 100 / 5?",
      "Solve 2 + 3 * 4",
      "15 - 7"
    )
    .withFunctions(calculateFunction)
    .build();

  const greetingContract = createIntent()
    .withId("greeting")
    .withName("Greetings")
    .withDescription("Handle user greetings and introductions")
    .withPatterns(
      "hello",
      "hi",
      "hey",
      "good (morning|afternoon|evening)",
      "greetings"
    )
    .withExamples("Hello!", "Hi there", "Good morning", "Hey, how are you?")
    .withFunctions(
      createFunction({
        name: "respond_greeting",
        description: "Respond to user greeting",
        parameters: {
          type: "object",
          properties: {
            timeOfDay: {
              type: "string",
              description: "Time of day for contextual greeting",
            },
          },
        },
        handler: async (params) => {
          const greetings = [
            "Hello! How can I help you today?",
            "Hi there! What can I do for you?",
            "Greetings! How may I assist you?",
          ];

          const greeting =
            greetings[Math.floor(Math.random() * greetings.length)];
          return {
            message: greeting,
            capabilities: [
              "Weather information",
              "Mathematical calculations",
              "General assistance",
            ],
          };
        },
      })
    )
    .build();

  // Register contracts
  framework.registerContracts([
    weatherContract,
    mathContract,
    greetingContract,
  ]);

  // Test conversations
  const testMessages = [
    "Hello there!",
    "What is the weather in New York?",
    "Calculate 25 * 4 + 10",
    "How is the weather in Tokyo?",
    "What is 100 / 5?",
    "Good morning!",
    "This is some random text that should not match any intent",
  ];

  console.log("🤖 Processing test messages...\n");

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    const conversationId = `conv_${i + 1}`;

    console.log(`👤 User: ${message}`);

    try {
      const response = await framework.process(
        message,
        conversationId,
        "test_user"
      );

      console.log(`🤖 Bot: ${response.response}`);
      console.log(`📊 Metadata:`, {
        intentDetected: response.metadata.intentDetected,
        functionsExecuted: response.metadata.functionsExecuted,
        executionTime: `${response.metadata.totalExecutionTime}ms`,
        confidence: response.metadata.confidence?.toFixed(2),
      });

      if (
        response.executionContext.functionCalls &&
        response.executionContext.functionCalls.length > 0
      ) {
        console.log(`🔧 Function calls:`);
        response.executionContext.functionCalls.forEach((call) => {
          console.log(
            `  - ${call.functionId}: ${call.result ? "Success" : "Failed"} (${
              call.executionTime
            }ms)`
          );
          if (call.result) {
            console.log(`    Result:`, call.result);
          }
          if (call.error) {
            console.log(`    Error:`, call.error);
          }
        });
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }

    console.log("\n" + "─".repeat(60) + "\n");
  }

  console.log("✅ Demo completed! Framework is ready for use.");

  // Cleanup
  await framework.destroy();
}

// ============================================================================
// Run the example
// ============================================================================

if (require.main === module) {
  runExample()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Demo failed:", error);
      process.exit(1);
    });
}

// Export for use as a module
export {
  IntentFramework,
  createIntent,
  createFunction,
  createContextProvider,
  createMiddleware,
  createLoggingMiddleware,
};
