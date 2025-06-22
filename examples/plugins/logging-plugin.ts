import { Plugin } from "../../src/types/plugins";
import {
  ExecutionContext,
  IntentFrameworkResponse,
} from "../../src/types/core";
import * as fs from "fs";
import * as path from "path";

interface LoggingPluginConfig {
  level?: "debug" | "info" | "warn" | "error";
  logToConsole?: boolean;
  logToFile?: boolean;
  logFilePath?: string;
  excludeEvents?: string[];
}

/**
 * A plugin that provides detailed logging of framework operations
 */
export class LoggingPlugin implements Plugin {
  public id = "logging-plugin";
  public name = "Logging Plugin";
  public description = "Provides detailed logging of framework operations";
  public priority = 100; // High priority to execute logging first

  private config: LoggingPluginConfig;
  private logStream: fs.WriteStream | null = null;

  constructor(config: LoggingPluginConfig = {}) {
    this.config = {
      level: config.level || "info",
      logToConsole: config.logToConsole !== false,
      logToFile: config.logToFile || false,
      logFilePath: config.logFilePath || "./logs/framework.log",
      excludeEvents: config.excludeEvents || [],
    };
  }

  /**
   * Initialize the plugin
   */
  public async initialize(): Promise<void> {
    this.log("debug", `Initializing ${this.name}`);

    if (this.config.logToFile) {
      try {
        // Ensure the directory exists
        const dir = path.dirname(this.config.logFilePath!);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Create the log stream
        this.logStream = fs.createWriteStream(this.config.logFilePath!, {
          flags: "a",
        });
        this.log("info", `Logging to file: ${this.config.logFilePath}`);
      } catch (error) {
        console.error(`Failed to initialize file logging: ${error}`);
      }
    }
  }

  /**
   * Shutdown the plugin
   */
  public async shutdown(): Promise<void> {
    this.log("debug", `Shutting down ${this.name}`);

    if (this.logStream) {
      await new Promise<void>((resolve) => {
        this.logStream!.end(() => {
          this.logStream = null;
          resolve();
        });
      });
    }
  }

  /**
   * Log before intent detection
   */
  public async onBeforeIntentDetection(
    context: ExecutionContext
  ): Promise<void> {
    if (this.shouldLogEvent("onBeforeIntentDetection")) {
      this.log("info", `Processing user message: "${context.userMessage}"`, {
        conversationId: context.conversationId,
        userId: context.userId,
      });
    }
  }

  /**
   * Log after intent detection
   */
  public async onAfterIntentDetection(
    context: ExecutionContext
  ): Promise<void> {
    if (
      this.shouldLogEvent("onAfterIntentDetection") &&
      context.detectedIntent
    ) {
      this.log(
        "info",
        `Detected intent "${context.detectedIntent.intent.name}" with confidence ${context.detectedIntent.confidence}`,
        {
          conversationId: context.conversationId,
          userId: context.userId,
          intentId: context.detectedIntent.intent.id,
          confidence: context.detectedIntent.confidence,
          entities: context.detectedIntent.extractedEntities,
        }
      );
    }
  }

  /**
   * Log before function execution
   */
  public async onBeforeFunctionExecution(
    context: ExecutionContext,
    functionId: string,
    parameters: any
  ): Promise<void> {
    if (this.shouldLogEvent("onBeforeFunctionExecution")) {
      this.log("debug", `Executing function "${functionId}"`, {
        conversationId: context.conversationId,
        userId: context.userId,
        functionId,
        parameters,
      });
    }
  }

  /**
   * Log after function execution
   */
  public async onAfterFunctionExecution(
    context: ExecutionContext,
    functionId: string,
    result: any,
    error?: string
  ): Promise<void> {
    if (this.shouldLogEvent("onAfterFunctionExecution")) {
      if (error) {
        this.log(
          "error",
          `Function "${functionId}" execution failed: ${error}`,
          {
            conversationId: context.conversationId,
            userId: context.userId,
            functionId,
            error,
          }
        );
      } else {
        this.log("debug", `Function "${functionId}" execution completed`, {
          conversationId: context.conversationId,
          userId: context.userId,
          functionId,
          result,
        });
      }
    }
  }

  /**
   * Log before response generation
   */
  public async onBeforeResponseGeneration(
    context: ExecutionContext
  ): Promise<void> {
    if (this.shouldLogEvent("onBeforeResponseGeneration")) {
      this.log("debug", "Generating response", {
        conversationId: context.conversationId,
        userId: context.userId,
        messageCount: context.messages.length,
      });
    }
  }

  /**
   * Log after response generation
   */
  public async onAfterResponseGeneration(
    context: ExecutionContext,
    response: IntentFrameworkResponse
  ): Promise<void> {
    if (this.shouldLogEvent("onAfterResponseGeneration")) {
      this.log(
        "info",
        `Response generated in ${response.metadata.totalExecutionTime}ms`,
        {
          conversationId: context.conversationId,
          userId: context.userId,
          executionTime: response.metadata.totalExecutionTime,
          functionsExecuted: response.metadata.functionsExecuted,
        }
      );
    }
  }

  /**
   * Handle errors
   */
  public async onError(
    error: Error,
    context?: ExecutionContext
  ): Promise<void> {
    if (this.shouldLogEvent("onError")) {
      this.log("error", `Framework error: ${error.message}`, {
        conversationId: context?.conversationId,
        userId: context?.userId,
        error: error.stack || error.message,
      });
    }
  }

  /**
   * Log a message
   */
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data: any = {}
  ): void {
    // Check if we should log this level
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levelPriority[level] < levelPriority[this.config.level!]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data,
    };

    // Log to console
    if (this.config.logToConsole) {
      const consoleMethod =
        level === "error"
          ? "error"
          : level === "warn"
            ? "warn"
            : level === "info"
              ? "info"
              : "debug";
      console[consoleMethod](
        `[${timestamp}] [${level.toUpperCase()}] ${message}`,
        data
      );
    }

    // Log to file
    if (this.config.logToFile && this.logStream) {
      this.logStream.write(`${JSON.stringify(logEntry)}\n`);
    }
  }

  /**
   * Check if an event should be logged
   */
  private shouldLogEvent(eventName: string): boolean {
    return !this.config.excludeEvents?.includes(eventName);
  }
}
