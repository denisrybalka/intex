import {
  ChatCompletionMessageParam,
  StorageExtensionConfig,
} from "../types/core";
import { StorageExtension } from "./storage";

/**
 * StorageManager encapsulates all interaction with the storage extension.
 * It provides a unified API for the framework to interact with storage
 * and handles the case when no storage extension is provided.
 */
export class StorageManager {
  private storage: StorageExtension | null = null;
  private logger: (
    level: "debug" | "info" | "warn" | "error",
    message: string
  ) => void;

  /**
   * Creates a new StorageManager
   *
   * @param storageExtension The optional storage extension to use
   * @param logger Function to log messages
   */
  constructor(
    storageExtension: StorageExtensionConfig,
    logger: (
      level: "debug" | "info" | "warn" | "error",
      message: string
    ) => void = () => {}
  ) {
    this.storage = storageExtension?.instance || null;
    this.logger = logger;
  }

  /**
   * Initializes the storage extension
   */
  async initialize(): Promise<void> {
    if (this.storage) {
      try {
        await this.storage.initialize();
      } catch (error) {
        this.logger(
          "error",
          `Failed to initialize storage extension: ${error}`
        );
      }
    } else {
      this.logger(
        "info",
        "No storage extension provided, operating in stateless mode"
      );
    }
  }

  /**
   * Gets conversation history for a specific conversation
   *
   * @param conversationId Unique identifier for the conversation
   * @returns The conversation history or empty array if no storage is available
   */
  async getConversationHistory(
    conversationId: string
  ): Promise<ChatCompletionMessageParam[]> {
    if (this.storage) {
      try {
        return await this.storage.getConversationHistory(conversationId);
      } catch (error) {
        this.logger("error", `Failed to get conversation history: ${error}`);
      }
    }
    return [];
  }

  /**
   * Updates conversation history for a specific conversation
   *
   * @param conversationId Unique identifier for the conversation
   * @param messages The messages to store
   */
  async updateConversationHistory(
    conversationId: string,
    messages: ChatCompletionMessageParam[]
  ): Promise<void> {
    if (this.storage) {
      try {
        await this.storage.updateConversationHistory(conversationId, messages);
      } catch (error) {
        this.logger("error", `Failed to update conversation history: ${error}`);
      }
    }
  }

  /**
   * Clears conversation history for a specific conversation
   *
   * @param conversationId Unique identifier for the conversation
   */
  async clearConversationHistory(conversationId: string): Promise<void> {
    if (this.storage) {
      try {
        await this.storage.clearConversationHistory(conversationId);
      } catch (error) {
        this.logger("error", `Failed to clear conversation history: ${error}`);
      }
    }
  }

  /**
   * Shuts down the storage extension
   */
  async shutdown(): Promise<void> {
    if (this.storage) {
      try {
        await this.storage.shutdown();
      } catch (error) {
        this.logger("error", `Failed to shut down storage extension: ${error}`);
      }
    }
  }

  /**
   * Checks if a storage extension is available
   */
  hasStorage(): boolean {
    return this.storage !== null;
  }
}
