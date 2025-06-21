import { Plugin } from "./base";
import { AnalyticsPlugin } from "../types/plugins";
import {
  ExecutionContext,
  IntentDetectionResult,
  IntentFrameworkResponse,
} from "../types/core";

export class BasicAnalyticsPlugin extends Plugin implements AnalyticsPlugin {
  private events: any[] = [];
  private persistCallback?: (events: any[]) => Promise<void>;

  constructor(config: {
    id: string;
    name: string;
    description: string;
    persistCallback?: (events: any[]) => Promise<void>;
  }) {
    super(config);
    this.persistCallback = config.persistCallback;
  }

  async initialize(): Promise<void> {
    // Initialize analytics - connect to external service if needed
    console.log(`Analytics plugin ${this.id} initialized`);
  }

  async shutdown(): Promise<void> {
    // Persist any remaining events
    if (this.persistCallback && this.events.length > 0) {
      await this.persistCallback(this.events);
    }

    console.log(`Analytics plugin ${this.id} shut down`);
  }

  async trackIntentDetection(result: IntentDetectionResult): Promise<void> {
    const event = {
      type: "intent_detection",
      timestamp: new Date(),
      intentId: result.intent.id,
      confidence: result.confidence,
      matchedPattern: result.matchedPattern,
    };

    this.events.push(event);
    await this.persistEvent(event);
  }

  async trackResponse(response: IntentFrameworkResponse): Promise<void> {
    const event = {
      type: "response",
      timestamp: new Date(),
      conversationId: response.executionContext.conversationId,
      userId: response.executionContext.userId,
      intentDetected: response.metadata.intentDetected,
      functionsExecuted: response.metadata.functionsExecuted,
      executionTime: response.metadata.totalExecutionTime,
    };

    this.events.push(event);
    await this.persistEvent(event);
  }

  async trackError(error: Error, context?: ExecutionContext): Promise<void> {
    const event = {
      type: "error",
      timestamp: new Date(),
      error: error.message,
      stack: error.stack,
      context: context
        ? {
            conversationId: context.conversationId,
            userId: context.userId,
          }
        : undefined,
    };

    this.events.push(event);
    await this.persistEvent(event);
  }

  private async persistEvent(event: any): Promise<void> {
    if (this.persistCallback) {
      await this.persistCallback([event]);
    }
  }

  getEvents(): any[] {
    return this.events;
  }
}
