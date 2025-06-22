import { ExecutionContext, IntentFrameworkResponse, BasePlugin } from "./core";

export interface Plugin extends BasePlugin {
  onBeforeIntentDetection?: (context: ExecutionContext) => Promise<void>;
  onAfterIntentDetection?: (context: ExecutionContext) => Promise<void>;
  onBeforeContextInjection?: (context: ExecutionContext) => Promise<void>;
  onAfterContextInjection?: (context: ExecutionContext) => Promise<void>;
  onBeforeFunctionExecution?: (
    context: ExecutionContext,
    functionId: string,
    parameters: any
  ) => Promise<void>;
  onAfterFunctionExecution?: (
    context: ExecutionContext,
    functionId: string,
    result: any,
    error?: string
  ) => Promise<void>;
  onBeforeResponseGeneration?: (context: ExecutionContext) => Promise<void>;
  onAfterResponseGeneration?: (
    context: ExecutionContext,
    response: IntentFrameworkResponse
  ) => Promise<void>;
  onError?: (error: Error, context?: ExecutionContext) => Promise<void>;

  priority?: number; // Controls execution order (higher executes first)
  dependencies?: string[]; // IDs of plugins that must execute before this one
}

export interface PluginManager {
  // Registration methods
  registerPlugin(plugin: Plugin): void;
  unregisterPlugin(pluginId: string): boolean;
  getPlugin(pluginId: string): Plugin | undefined;
  getAllPlugins(): Plugin[];

  // Lifecycle management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Hook execution methods
  executeHook<T extends keyof HookMap>(
    hookName: T,
    ...args: Parameters<HookMap[T]>
  ): Promise<void>;
}

// Helper type for type-safe hook execution
export interface HookMap {
  onBeforeIntentDetection: (context: ExecutionContext) => Promise<void>;
  onAfterIntentDetection: (context: ExecutionContext) => Promise<void>;
  onBeforeContextInjection: (context: ExecutionContext) => Promise<void>;
  onAfterContextInjection: (context: ExecutionContext) => Promise<void>;
  onBeforeFunctionExecution: (
    context: ExecutionContext,
    functionId: string,
    parameters: any
  ) => Promise<void>;
  onAfterFunctionExecution: (
    context: ExecutionContext,
    functionId: string,
    result: any,
    error?: string
  ) => Promise<void>;
  onBeforeResponseGeneration: (context: ExecutionContext) => Promise<void>;
  onAfterResponseGeneration: (
    context: ExecutionContext,
    response: IntentFrameworkResponse
  ) => Promise<void>;
  onError: (error: Error, context?: ExecutionContext) => Promise<void>;
}
