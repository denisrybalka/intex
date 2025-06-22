import { ChatCompletionMessageParam } from "../../src";
import { BaseStorageExtension } from "../../src/extensions";

/**
 * Example custom storage implementation using Redis
 * Note: This is a simplified example that doesn't include actual Redis implementation
 */
export class RedisStorageExtension extends BaseStorageExtension {
  // Simulated Redis client
  private redisClient: any;
  private prefix: string;

  constructor(config: {
    id?: string;
    name?: string;
    description?: string;
    redisConfig?: any;
    keyPrefix?: string;
  }) {
    super({
      id: config.id || "redis-storage",
      name: config.name || "Redis Storage",
      description:
        config.description ||
        "Redis-based storage for conversation history and context",
    });

    this.prefix = config.keyPrefix || "intent-framework:";
    // In a real implementation, you would initialize the Redis client here
    this.redisClient = {
      get: async (key: string) => {
        console.log(`[Redis Mock] GET ${key}`);
        return null;
      },
      set: async (key: string, value: string) => {
        console.log(`[Redis Mock] SET ${key}`);
      },
      del: async (key: string) => {
        console.log(`[Redis Mock] DEL ${key}`);
      },
      lpush: async (key: string, value: string) => {
        console.log(`[Redis Mock] LPUSH ${key}`);
      },
      lrange: async (key: string, start: number, end: number) => {
        console.log(`[Redis Mock] LRANGE ${key}`);
        return [];
      },
      quit: async () => {
        console.log(`[Redis Mock] QUIT`);
      },
    };
  }

  async initialize(): Promise<void> {
    console.log("Initializing Redis storage extension");
    // In a real implementation, you would connect to Redis here
  }

  async getConversationHistory(
    conversationId: string
  ): Promise<ChatCompletionMessageParam[]> {
    const key = `${this.prefix}conversation:${conversationId}`;
    const data = await this.redisClient.get(key);

    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error("Error parsing conversation history from Redis:", error);
      return [];
    }
  }

  async updateConversationHistory(
    conversationId: string,
    messages: ChatCompletionMessageParam[]
  ): Promise<void> {
    const key = `${this.prefix}conversation:${conversationId}`;
    await this.redisClient.set(key, JSON.stringify(messages));
  }

  async clearConversationHistory(conversationId: string): Promise<void> {
    const conversationKey = `${this.prefix}conversation:${conversationId}`;
    await this.redisClient.del(conversationKey);
  }

  async shutdown(): Promise<void> {
    console.log("Shutting down Redis storage extension");
    // Close Redis connection
    await this.redisClient.quit();
  }
}
