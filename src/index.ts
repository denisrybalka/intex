// Export main framework
export { IntentFramework } from "./core/framework";

// Export types
export * from "./types";

// Export builders
export { createIntent } from "./builders/intent";
export { createFunction } from "./builders/function";

// Export middleware
export {
  createMiddleware,
  createLoggingMiddleware,
  createAuthMiddleware,
  createRateLimitMiddleware,
} from "./middleware";

// Export plugins
export { Plugin, BasicAnalyticsPlugin, MemoryCachePlugin } from "./plugins";

// Export utils
export { validateContract } from "./utils/validation";
export {
  estimateTokenCount,
  estimateMessagesTokenCount,
  estimateFunctionTokenCount,
} from "./utils/token-counter";
export {
  extractEntitiesFromPattern,
  extractEntitiesWithLLM,
} from "./utils/entity-extractor";
export {
  matchPattern,
  matchPatternWithGroups,
  fuzzyMatchPattern,
} from "./utils/pattern-matcher";
