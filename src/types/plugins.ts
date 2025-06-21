import {
  ExecutionContext,
  IntentDetectionResult,
  IntentFrameworkResponse,
} from "./core";

export interface BasePlugin {
  id: string;
  name: string;
  description: string;
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
}

export interface AnalyticsPlugin extends BasePlugin {
  trackIntentDetection: (result: IntentDetectionResult) => Promise<void>;
  trackResponse: (response: IntentFrameworkResponse) => Promise<void>;
  trackError: (error: Error, context?: ExecutionContext) => Promise<void>;
}

export interface CachePlugin extends BasePlugin {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}
