import { StorageManager } from "../../../src/extensions/storage-manager";
import { StorageExtension } from "../../../src/extensions/storage";
import { ChatCompletionMessageParam } from "../../../src/types";

describe("StorageManager", () => {
  let mockLogger: jest.Mock;
  let mockStorage: jest.Mocked<StorageExtension>;
  let storageManager: StorageManager;

  beforeEach(() => {
    mockLogger = jest.fn();

    // Create mock storage extension
    mockStorage = {
      id: "test-storage",
      name: "Test Storage",
      description: "A test storage extension",
      initialize: jest.fn().mockImplementation(() => Promise.resolve()),
      shutdown: jest.fn().mockImplementation(() => Promise.resolve()),
      getConversationHistory: jest
        .fn()
        .mockImplementation(() => Promise.resolve([])),
      updateConversationHistory: jest
        .fn()
        .mockImplementation(() => Promise.resolve()),
      clearConversationHistory: jest
        .fn()
        .mockImplementation(() => Promise.resolve()),
    } as unknown as jest.Mocked<StorageExtension>;
  });

  describe("Initialization", () => {
    it("should initialize with storage extension", async () => {
      storageManager = new StorageManager(
        { instance: mockStorage },
        mockLogger
      );
      await storageManager.initialize();

      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    it("should handle missing storage extension", async () => {
      storageManager = new StorageManager(null, mockLogger);
      await storageManager.initialize();

      expect(mockLogger).toHaveBeenCalledWith(
        "info",
        expect.stringContaining("operating in stateless mode")
      );
    });

    it("should handle errors during initialization", async () => {
      const error = new Error("Initialization error");
      mockStorage.initialize.mockRejectedValueOnce(error);

      storageManager = new StorageManager(
        { instance: mockStorage },
        mockLogger
      );
      await storageManager.initialize();

      expect(mockLogger).toHaveBeenCalledWith(
        "error",
        expect.stringContaining("Failed to initialize storage extension")
      );
    });
  });

  describe("Conversation History Management", () => {
    const conversationId = "test-conversation";
    const testMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "How can I help you?" },
    ];

    beforeEach(() => {
      storageManager = new StorageManager(
        { instance: mockStorage },
        mockLogger
      );
    });

    it("should get conversation history from storage", async () => {
      mockStorage.getConversationHistory.mockResolvedValueOnce(testMessages);

      const result =
        await storageManager.getConversationHistory(conversationId);

      expect(mockStorage.getConversationHistory).toHaveBeenCalledWith(
        conversationId
      );
      expect(result).toEqual(testMessages);
    });

    it("should return empty array when no storage is available", async () => {
      storageManager = new StorageManager(null, mockLogger);

      const result =
        await storageManager.getConversationHistory(conversationId);
      expect(result).toEqual([]);
    });

    it("should handle errors when getting conversation history", async () => {
      const error = new Error("Get history error");
      mockStorage.getConversationHistory.mockRejectedValueOnce(error);

      const result =
        await storageManager.getConversationHistory(conversationId);

      expect(mockLogger).toHaveBeenCalledWith(
        "error",
        expect.stringContaining("Failed to get conversation history")
      );
      expect(result).toEqual([]);
    });

    it("should update conversation history in storage", async () => {
      await storageManager.updateConversationHistory(
        conversationId,
        testMessages
      );

      expect(mockStorage.updateConversationHistory).toHaveBeenCalledWith(
        conversationId,
        testMessages
      );
    });

    it("should not call updateConversationHistory when no storage is available", async () => {
      storageManager = new StorageManager(null, mockLogger);

      await storageManager.updateConversationHistory(
        conversationId,
        testMessages
      );

      expect(mockStorage.updateConversationHistory).not.toHaveBeenCalled();
    });

    it("should handle errors when updating conversation history", async () => {
      const error = new Error("Update history error");
      mockStorage.updateConversationHistory.mockRejectedValueOnce(error);

      await storageManager.updateConversationHistory(
        conversationId,
        testMessages
      );

      expect(mockLogger).toHaveBeenCalledWith(
        "error",
        expect.stringContaining("Failed to update conversation history")
      );
    });

    it("should clear conversation history in storage", async () => {
      await storageManager.clearConversationHistory(conversationId);

      expect(mockStorage.clearConversationHistory).toHaveBeenCalledWith(
        conversationId
      );
    });

    it("should not call clearConversationHistory when no storage is available", async () => {
      storageManager = new StorageManager(null, mockLogger);

      await storageManager.clearConversationHistory(conversationId);

      expect(mockStorage.clearConversationHistory).not.toHaveBeenCalled();
    });

    it("should handle errors when clearing conversation history", async () => {
      const error = new Error("Clear history error");
      mockStorage.clearConversationHistory.mockRejectedValueOnce(error);

      await storageManager.clearConversationHistory(conversationId);

      expect(mockLogger).toHaveBeenCalledWith(
        "error",
        expect.stringContaining("Failed to clear conversation history")
      );
    });
  });

  describe("Shutdown", () => {
    it("should shutdown the storage extension", async () => {
      storageManager = new StorageManager(
        { instance: mockStorage },
        mockLogger
      );

      await storageManager.shutdown();

      expect(mockStorage.shutdown).toHaveBeenCalled();
    });

    it("should handle errors during shutdown", async () => {
      const error = new Error("Shutdown error");
      mockStorage.shutdown.mockRejectedValueOnce(error);

      storageManager = new StorageManager(
        { instance: mockStorage },
        mockLogger
      );
      await storageManager.shutdown();

      expect(mockLogger).toHaveBeenCalledWith(
        "error",
        expect.stringContaining("Failed to shut down storage extension")
      );
    });
  });

  describe("Storage availability check", () => {
    it("should return true when storage extension is provided", () => {
      storageManager = new StorageManager(
        { instance: mockStorage },
        mockLogger
      );

      expect(storageManager.hasStorage()).toBe(true);
    });

    it("should return false when no storage extension is provided", () => {
      storageManager = new StorageManager(null, mockLogger);

      expect(storageManager.hasStorage()).toBe(false);
    });
  });
});
