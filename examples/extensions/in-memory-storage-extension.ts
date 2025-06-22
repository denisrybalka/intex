import { ChatCompletionMessageParam } from "../../src";
import { BaseStorageExtension } from "../../src/extensions";

/**
 * Example custom storage implementation using a simple in-memory store
 * This is ideal for examples, demos and testing
 */
export class InMemoryStorageExtension extends BaseStorageExtension {
  // Simple in-memory store using a Map
  private conversationStore: Map<string, ChatCompletionMessageParam[]>;

  constructor(
    config: {
      id?: string;
      name?: string;
      description?: string;
    } = {}
  ) {
    super({
      id: config.id || "in-memory-storage",
      name: config.name || "In-Memory Storage",
      description:
        config.description ||
        "Simple in-memory storage for conversation history",
    });

    this.conversationStore = new Map();
  }

  async initialize(): Promise<void> {
    console.log("Initializing in-memory storage extension");
    // Nothing to initialize for in-memory storage
  }

  async getConversationHistory(
    conversationId: string
  ): Promise<ChatCompletionMessageParam[]> {
    return this.conversationStore.get(conversationId) || [];
  }

  async updateConversationHistory(
    conversationId: string,
    messages: ChatCompletionMessageParam[]
  ): Promise<void> {
    this.conversationStore.set(conversationId, messages);
  }

  async clearConversationHistory(conversationId: string): Promise<void> {
    this.conversationStore.delete(conversationId);
  }

  async shutdown(): Promise<void> {
    console.log("Shutting down in-memory storage extension");
    // Clear all data
    this.conversationStore.clear();
  }

  // Additional methods specific to in-memory implementation

  /**
   * Get the current size of the storage (number of conversations)
   */
  getStorageSize(): number {
    return this.conversationStore.size;
  }

  /**
   * Clear all stored conversations
   */
  clearAllConversations(): void {
    this.conversationStore.clear();
  }

  /**
   * Get all conversation IDs currently stored
   */
  getAllConversationIds(): string[] {
    return Array.from(this.conversationStore.keys());
  }

  /**
   * Check if a conversation exists in storage
   */
  hasConversation(conversationId: string): boolean {
    return this.conversationStore.has(conversationId);
  }
}
