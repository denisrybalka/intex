import { ChatCompletionMessageParam } from "../types/core";

/**
 * Interface for storage extensions that can be contributed to the framework
 * for storing and retrieving conversation history
 */
export interface StorageExtension {
  /**
   * Unique identifier for the storage extension
   */
  id: string;

  /**
   * Human-readable name for the extension
   */
  name: string;

  /**
   * Description of the storage extension capabilities
   */
  description: string;

  /**
   * Initialize the storage extension
   */
  initialize(): Promise<void>;

  /**
   * Retrieve conversation history for a specific conversation
   * @param conversationId Unique identifier for the conversation
   * @returns Array of OpenAI chat completion messages
   */
  getConversationHistory(
    conversationId: string
  ): Promise<ChatCompletionMessageParam[]>;

  /**
   * Update conversation history for a specific conversation
   * @param conversationId Unique identifier for the conversation
   * @param messages Updated array of chat completion messages
   */
  updateConversationHistory(
    conversationId: string,
    messages: ChatCompletionMessageParam[]
  ): Promise<void>;

  /**
   * Clear conversation history for a specific conversation
   * @param conversationId Unique identifier for the conversation
   */
  clearConversationHistory(conversationId: string): Promise<void>;

  /**
   * Shut down the storage extension and clean up resources
   */
  shutdown(): Promise<void>;
}

/**
 * Base class for implementing storage extensions
 */
export abstract class BaseStorageExtension implements StorageExtension {
  id: string;
  name: string;
  description: string;

  constructor(config: { id: string; name: string; description: string }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
  }

  abstract initialize(): Promise<void>;
  abstract getConversationHistory(
    conversationId: string
  ): Promise<ChatCompletionMessageParam[]>;
  abstract updateConversationHistory(
    conversationId: string,
    messages: ChatCompletionMessageParam[]
  ): Promise<void>;
  abstract clearConversationHistory(conversationId: string): Promise<void>;
  abstract shutdown(): Promise<void>;
}
