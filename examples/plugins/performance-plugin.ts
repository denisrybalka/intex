import { Plugin } from "../../../src/types/plugins";
import {
  ExecutionContext,
  IntentFrameworkResponse,
} from "../../../src/types/core";

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformancePluginConfig {
  measureExecutionTime?: boolean;
  memoryUsageTracking?: boolean;
  slowOperationThreshold?: number; // milliseconds
  detailedMetrics?: boolean;
}

/**
 * A plugin that monitors and measures performance metrics
 */
export class PerformancePlugin implements Plugin {
  public id = "performance-plugin";
  public name = "Performance Plugin";
  public description =
    "Monitors and measures performance metrics of framework operations";
  public priority = 80;

  private config: PerformancePluginConfig;
  private activeMetrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];

  constructor(config: PerformancePluginConfig = {}) {
    this.config = {
      measureExecutionTime: config.measureExecutionTime !== false,
      memoryUsageTracking: config.memoryUsageTracking || false,
      slowOperationThreshold: config.slowOperationThreshold || 500, // 500ms
      detailedMetrics: config.detailedMetrics || false,
    };
  }

  /**
   * Initialize the plugin
   */
  public async initialize(): Promise<void> {
    this.startMetric("framework_initialized", {
      memoryUsage: this.getCurrentMemoryUsage(),
    });
    this.endMetric("framework_initialized");
  }

  /**
   * Shutdown the plugin
   */
  public async shutdown(): Promise<void> {
    // Complete any active metrics before shutdown
    for (const [key, metric] of this.activeMetrics.entries()) {
      this.endMetric(key, { reason: "shutdown" });
    }

    // In a real implementation, we might want to persist these metrics
    if (this.config.detailedMetrics) {
      console.debug("Performance metrics:", this.completedMetrics);
    }
  }

  /**
   * Measure before intent detection
   */
  public async onBeforeIntentDetection(
    context: ExecutionContext
  ): Promise<void> {
    if (this.config.measureExecutionTime) {
      this.startMetric(`intent_detection:${context.conversationId}`, {
        userId: context.userId,
        messageLength: context.userMessage.length,
        memoryUsage: this.config.memoryUsageTracking
          ? this.getCurrentMemoryUsage()
          : undefined,
      });
    }
  }

  /**
   * Measure after intent detection
   */
  public async onAfterIntentDetection(
    context: ExecutionContext
  ): Promise<void> {
    if (this.config.measureExecutionTime) {
      this.endMetric(`intent_detection:${context.conversationId}`, {
        intentId: context.detectedIntent?.intent.id,
        confidence: context.detectedIntent?.confidence,
        memoryUsage: this.config.memoryUsageTracking
          ? this.getCurrentMemoryUsage()
          : undefined,
      });
    }
  }

  /**
   * Measure before function execution
   */
  public async onBeforeFunctionExecution(
    context: ExecutionContext,
    functionId: string,
    parameters: any
  ): Promise<void> {
    if (this.config.measureExecutionTime) {
      this.startMetric(
        `function_execution:${context.conversationId}:${functionId}`,
        {
          userId: context.userId,
          functionId,
          memoryUsage: this.config.memoryUsageTracking
            ? this.getCurrentMemoryUsage()
            : undefined,
        }
      );
    }
  }

  /**
   * Measure after function execution
   */
  public async onAfterFunctionExecution(
    context: ExecutionContext,
    functionId: string,
    result: any,
    error?: string
  ): Promise<void> {
    if (this.config.measureExecutionTime) {
      const metric = this.endMetric(
        `function_execution:${context.conversationId}:${functionId}`,
        {
          success: !error,
          error: error ? true : false,
          memoryUsage: this.config.memoryUsageTracking
            ? this.getCurrentMemoryUsage()
            : undefined,
        }
      );

      // Log slow functions
      if (
        metric &&
        metric.duration &&
        metric.duration > this.config.slowOperationThreshold!
      ) {
        console.warn(
          `Slow function execution: ${functionId} took ${metric.duration}ms`
        );
      }
    }
  }

  /**
   * Measure before response generation
   */
  public async onBeforeResponseGeneration(
    context: ExecutionContext
  ): Promise<void> {
    if (this.config.measureExecutionTime) {
      this.startMetric(`response_generation:${context.conversationId}`, {
        userId: context.userId,
        messageCount: context.messages.length,
        memoryUsage: this.config.memoryUsageTracking
          ? this.getCurrentMemoryUsage()
          : undefined,
      });
    }
  }

  /**
   * Measure after response generation
   */
  public async onAfterResponseGeneration(
    context: ExecutionContext,
    response: IntentFrameworkResponse
  ): Promise<void> {
    if (this.config.measureExecutionTime) {
      const metric = this.endMetric(
        `response_generation:${context.conversationId}`,
        {
          responseLength: response.response.length,
          totalExecutionTime: response.metadata.totalExecutionTime,
          functionsExecuted: response.metadata.functionsExecuted,
          memoryUsage: this.config.memoryUsageTracking
            ? this.getCurrentMemoryUsage()
            : undefined,
        }
      );

      // Log slow response generation
      if (
        metric &&
        metric.duration &&
        metric.duration > this.config.slowOperationThreshold!
      ) {
        console.warn(
          `Slow response generation for conversation ${context.conversationId}: ${metric.duration}ms`
        );
      }
    }

    // Generate performance report
    if (this.config.detailedMetrics) {
      const conversationMetrics = this.completedMetrics.filter((m) =>
        m.name.includes(context.conversationId)
      );

      const report = {
        conversationId: context.conversationId,
        totalExecutionTime: response.metadata.totalExecutionTime,
        intentDetectionTime: this.getMetricDuration(
          `intent_detection:${context.conversationId}`
        ),
        functionExecutionTimes: this.getFunctionExecutionTimes(
          context.conversationId
        ),
        responseGenerationTime: this.getMetricDuration(
          `response_generation:${context.conversationId}`
        ),
      };

      console.debug("Performance report:", report);
    }
  }

  /**
   * Handle errors
   */
  public async onError(
    error: Error,
    context?: ExecutionContext
  ): Promise<void> {
    if (context) {
      // End any active metrics for this conversation to avoid leaks
      for (const [key, metric] of this.activeMetrics.entries()) {
        if (key.includes(context.conversationId)) {
          this.endMetric(key, { error: true, errorMessage: error.message });
        }
      }
    }
  }

  /**
   * Start measuring a metric
   */
  private startMetric(
    name: string,
    metadata?: Record<string, any>
  ): PerformanceMetric {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    };

    this.activeMetrics.set(name, metric);
    return metric;
  }

  /**
   * End measuring a metric
   */
  private endMetric(
    name: string,
    additionalMetadata?: Record<string, any>
  ): PerformanceMetric | undefined {
    const metric = this.activeMetrics.get(name);
    if (!metric) return undefined;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    this.activeMetrics.delete(name);
    this.completedMetrics.push(metric);

    return metric;
  }

  /**
   * Get the current memory usage
   */
  private getCurrentMemoryUsage(): Record<string, number> {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
      return {
        rss: Math.round(rss / 1024 / 1024), // MB
        heapTotal: Math.round(heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(heapUsed / 1024 / 1024), // MB
        external: Math.round(external / 1024 / 1024), // MB
      };
    }
    return {};
  }

  /**
   * Get the duration of a completed metric
   */
  private getMetricDuration(name: string): number | undefined {
    const metric = this.completedMetrics.find((m) => m.name === name);
    return metric?.duration;
  }

  /**
   * Get function execution times for a conversation
   */
  private getFunctionExecutionTimes(
    conversationId: string
  ): Record<string, number> {
    const result: Record<string, number> = {};

    this.completedMetrics
      .filter((m) => m.name.startsWith(`function_execution:${conversationId}:`))
      .forEach((metric) => {
        const functionId = metric.name.split(":")[2];
        result[functionId] = metric.duration || 0;
      });

    return result;
  }
}
