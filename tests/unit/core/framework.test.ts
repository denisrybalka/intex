import { IntentFramework } from "../../../src/core/framework";
import {
  IntentContract,
  IntentFrameworkConfig,
  BaseIntent,
  Plugin,
  IntentMiddleware,
} from "../../../src/types";
import * as detection from "../../../src/core/detection";
import * as execution from "../../../src/core/execution";
import { StorageManager } from "../../../src/extensions";
import { PluginManager } from "../../../src/plugins";

// Mock dependencies
jest.mock("openai");
jest.mock("../../../src/core/detection");
jest.mock("../../../src/core/execution");
jest.mock("../../../src/extensions/storage-manager");
jest.mock("../../../src/plugins/plugin-manager");

describe("IntentFramework", () => {
  let framework: IntentFramework;
  let mockConfig: IntentFrameworkConfig;
  let mockStorageManager: jest.Mocked<StorageManager>;
  let mockPluginManager: jest.Mocked<any>;
  let mockOpenAI: any;

  beforeEach(() => {
    // Mock the OpenAI class constructor
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockImplementation(() => {
            return {
              choices: [
                {
                  message: {
                    content: "This is a test response",
                    role: "assistant",
                  },
                },
              ],
            };
          }),
        },
      },
    };

    (global as any).OpenAI = jest.fn().mockImplementation(() => mockOpenAI);

    // Setup mocks for StorageManager
    const mockStorageManagerInstance = {
      initialize: jest.fn(),
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
    };

    // Reset and setup StorageManager constructor mock
    const mockStorageManagerConstructor = jest
      .fn()
      .mockImplementation(() => mockStorageManagerInstance);
    (StorageManager as unknown as jest.Mock).mockImplementation(
      mockStorageManagerConstructor
    );

    mockStorageManager =
      mockStorageManagerInstance as unknown as jest.Mocked<StorageManager>;

    mockPluginManager = {
      registerPlugin: jest.fn(),
      executeHook: jest.fn().mockImplementation(() => Promise.resolve()),
      shutdown: jest.fn().mockImplementation(() => Promise.resolve()),
    };

    // Mock static getInstance method
    (PluginManager.getInstance as jest.Mock).mockReturnValue(mockPluginManager);

    // Mock detection methods
    jest
      .spyOn(detection, "detectIntentByPattern")
      .mockImplementation(() => Promise.resolve(null));
    jest
      .spyOn(detection, "detectIntentByLLM")
      .mockImplementation(() => Promise.resolve(null));

    // Mock execution methods
    jest.spyOn(execution, "prepareFunctionTools").mockReturnValue([]);
    jest
      .spyOn(execution, "executeFunctionCalls")
      .mockImplementation(() => Promise.resolve());

    // Setup config
    mockConfig = {
      openai: {
        apiKey: "test-api-key",
        model: "gpt-test",
      },
      intentDetection: {
        strategy: "pattern",
        confidenceThreshold: 0.5,
      },
      logging: {
        enabled: false,
      },
      storageExtension: null,
    };

    framework = new IntentFramework(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Contract Management", () => {
    it("should register a contract correctly", () => {
      const mockContract: IntentContract = {
        intent: {
          id: "test-intent",
          name: "Test Intent",
          description: "A test intent",
          patterns: ["test pattern"],
          examples: [],
        },
        functions: [
          {
            id: "test-function",
            name: "testFunction",
            description: "A test function",
            parameters: {},
            handler: jest.fn(),
          },
        ],
      };

      framework.registerContract(mockContract);

      const contracts = framework.getContracts();
      expect(contracts).toHaveLength(1);
      expect(contracts[0]).toBe(mockContract);
    });

    it("should register multiple contracts", () => {
      const mockContracts: IntentContract[] = [
        {
          intent: {
            id: "intent1",
            name: "Intent One",
            description: "First test intent",
            patterns: ["test pattern 1"],
            examples: [],
          },
          functions: [],
        },
        {
          intent: {
            id: "intent2",
            name: "Intent Two",
            description: "Second test intent",
            patterns: ["test pattern 2"],
            examples: [],
          },
          functions: [],
        },
      ];

      framework.registerContracts(mockContracts);

      const contracts = framework.getContracts();
      expect(contracts).toHaveLength(2);
      expect(contracts.map((c) => c.intent.id).sort()).toEqual([
        "intent1",
        "intent2",
      ]);
    });
  });

  describe("Plugin Management", () => {
    it("should register a plugin correctly", () => {
      const createMockPlugin = () => ({
        id: "test-plugin",
        name: "Test Plugin",
        description: "A test plugin",
        initialize: jest.fn().mockImplementation(() => Promise.resolve()),
        shutdown: jest.fn().mockImplementation(() => Promise.resolve()),
      });

      const mockPlugin = createMockPlugin();
      framework.registerPlugin(mockPlugin as unknown as Plugin);

      expect(mockPluginManager.registerPlugin).toHaveBeenCalledWith(mockPlugin);
    });
  });

  describe("Framework Shutdown", () => {
    it("should shutdown plugins and storage manager", async () => {
      await framework.shutdown();

      expect(mockPluginManager.shutdown).toHaveBeenCalled();
      expect(mockStorageManager.shutdown).toHaveBeenCalled();
    });
  });

  describe("Message Processing", () => {
    beforeEach(() => {
      // Mock storage manager methods
      // Setup a mock intent detection result for tests
      const mockIntent: BaseIntent = {
        id: "weather",
        name: "Weather Intent",
        description: "Get weather information",
        patterns: ["weather"],
        examples: [],
      };

      jest.spyOn(detection, "detectIntentByPattern").mockImplementation(() =>
        Promise.resolve({
          intent: mockIntent,
          confidence: 0.8,
          matchedPattern: "weather",
        })
      );

      // Register a mock contract
      framework.registerContract({
        intent: mockIntent,
        functions: [
          {
            id: "getWeather",
            name: "getWeather",
            description: "Get weather information",
            parameters: { type: "object", properties: {} },
            handler: jest.fn(),
          },
        ],
      });
    });

    it("should process a user message with detected intent", async () => {
      const response = await framework.process(
        "what is the weather?",
        "conv123",
        "user456"
      );

      // Check that the intent detection was called
      expect(detection.detectIntentByPattern).toHaveBeenCalled();

      // Check that plugin hooks were called
      expect(mockPluginManager.executeHook).toHaveBeenCalledWith(
        "onBeforeIntentDetection",
        expect.objectContaining({
          conversationId: "conv123",
          userId: "user456",
          userMessage: "what is the weather?",
        })
      );

      expect(mockPluginManager.executeHook).toHaveBeenCalledWith(
        "onAfterIntentDetection",
        expect.anything()
      );

      // Verify response
      expect(response).toBeDefined();
      expect(response.executionContext.userMessage).toBe(
        "what is the weather?"
      );
    });

    it("should handle fallback when no intent is detected", async () => {
      // Override the mock to return null (no intent detected)
      jest
        .spyOn(detection, "detectIntentByPattern")
        .mockImplementationOnce(() => Promise.resolve(null));

      const response = await framework.process(
        "unrecognized message",
        "conv123"
      );

      expect(response.response).toContain("not sure how to help");
      expect(response.metadata.intentDetected).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      // Force an error
      jest
        .spyOn(detection, "detectIntentByPattern")
        .mockImplementationOnce(() => Promise.reject(new Error("Test error")));

      const response = await framework.process("trigger error", "conv123");

      expect(response.response).toContain("encountered an error");
      expect(mockPluginManager.executeHook).toHaveBeenCalledWith(
        "onError",
        expect.any(Error),
        expect.anything()
      );
    });

    it("should clear conversation history", async () => {
      await framework.clearConversationHistory("conv123");
      expect(mockStorageManager.clearConversationHistory).toHaveBeenCalledWith(
        "conv123"
      );
    });
  });

  describe("Middleware Processing", () => {
    let mockIntent: BaseIntent;
    let mockMiddleware: IntentMiddleware;
    let mockMiddlewareStopping: IntentMiddleware;
    let mockMiddlewareWithContext: IntentMiddleware;

    beforeEach(() => {
      // Setup basic intent
      mockIntent = {
        id: "test-intent",
        name: "Test Intent",
        description: "A test intent",
        patterns: ["test pattern"],
        examples: [],
      };

      // Setup middleware that allows processing to continue
      mockMiddleware = {
        id: "test-middleware",
        execute: jest.fn().mockResolvedValue({ continue: true }),
      };

      // Setup middleware that stops processing
      mockMiddlewareStopping = {
        id: "stopping-middleware",
        execute: jest.fn().mockResolvedValue({ continue: false }),
      };

      // Setup middleware that modifies context
      mockMiddlewareWithContext = {
        id: "context-middleware",
        execute: jest.fn().mockResolvedValue({
          continue: true,
          modifiedContext: {
            id: "modified-context",
            data: { modified: true },
          },
        }),
      };

      // Mock detection to return our test intent
      jest.spyOn(detection, "detectIntentByPattern").mockImplementation(() =>
        Promise.resolve({
          intent: mockIntent,
          confidence: 0.9,
          matchedPattern: "test pattern",
        })
      );

      // Create framework instance for testing
      framework = new IntentFramework(mockConfig);
    });

    it("should process middleware and continue when middleware allows", async () => {
      // Register a contract with middleware
      const contract = {
        intent: mockIntent,
        functions: [
          {
            id: "test-function",
            name: "testFunction",
            description: "A test function",
            parameters: {},
            handler: jest.fn(),
          },
        ],
        middleware: [mockMiddleware],
      };

      framework.registerContract(contract);

      // Process a message
      const response = await framework.process("test message", "conv123");

      // Assert the middleware was executed
      expect(mockMiddleware.execute).toHaveBeenCalledWith(
        mockIntent,
        "test message",
        undefined
      );

      // Verify that processing continued (not stopped by middleware)
      expect(response.response).not.toContain("stopped by a validation rule");

      // Verify that hooks after middleware execution were called
      expect(mockPluginManager.executeHook).toHaveBeenCalledWith(
        "onBeforeContextInjection",
        expect.anything()
      );

      // Verify the function flow continued
      expect(execution.prepareFunctionTools).toHaveBeenCalled();
    });

    it("should stop processing when middleware returns continue: false", async () => {
      // Register a contract with stopping middleware
      const contract = {
        intent: mockIntent,
        functions: [
          {
            id: "test-function",
            name: "testFunction",
            description: "A test function",
            parameters: {},
            handler: jest.fn(),
          },
        ],
        middleware: [mockMiddlewareStopping],
      };

      framework.registerContract(contract);

      // Process a message
      const response = await framework.process("test message", "conv123");

      // Assert the middleware was executed
      expect(mockMiddlewareStopping.execute).toHaveBeenCalledWith(
        mockIntent,
        "test message",
        undefined
      );

      // OpenAI should not be called since middleware returned continue: false
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();

      // Response should indicate middleware stopped processing
      expect(response.response).toContain("stopped by a validation rule");
    });

    it("should apply modified context from middleware", async () => {
      // Register a contract with context-modifying middleware
      const contract = {
        intent: mockIntent,
        functions: [
          {
            id: "test-function",
            name: "testFunction",
            description: "A test function",
            parameters: {},
            handler: jest.fn(),
          },
        ],
        middleware: [mockMiddlewareWithContext],
      };

      framework.registerContract(contract);

      // Process a message
      await framework.process("test message", "conv123");

      // Assert the middleware modified the context
      expect(mockPluginManager.executeHook).toHaveBeenCalledWith(
        "onAfterContextInjection",
        expect.objectContaining({
          injectedContext: expect.objectContaining({
            id: "modified-context",
            data: { modified: true },
          }),
        })
      );
    });

    it("should process multiple middleware in sequence", async () => {
      // Setup a sequence spy
      const sequence: string[] = [];

      const firstMiddleware = {
        id: "first-middleware",
        execute: jest.fn().mockImplementation(async () => {
          sequence.push("first");
          return { continue: true };
        }),
      };

      const secondMiddleware = {
        id: "second-middleware",
        execute: jest.fn().mockImplementation(async () => {
          sequence.push("second");
          return { continue: true };
        }),
      };

      // Register a contract with multiple middleware
      const contract = {
        intent: mockIntent,
        functions: [
          {
            id: "test-function",
            name: "testFunction",
            description: "A test function",
            parameters: {},
            handler: jest.fn(),
          },
        ],
        middleware: [firstMiddleware, secondMiddleware],
      };

      framework.registerContract(contract);

      // Process a message
      await framework.process("test message", "conv123");

      // Assert middleware was executed in sequence
      expect(firstMiddleware.execute).toHaveBeenCalled();
      expect(secondMiddleware.execute).toHaveBeenCalled();
      expect(sequence).toEqual(["first", "second"]);
    });

    it("should stop at first middleware that returns continue: false", async () => {
      // Setup middleware sequence
      const sequence: string[] = [];

      const firstMiddleware = {
        id: "first-middleware",
        execute: jest.fn().mockImplementation(async () => {
          sequence.push("first");
          return { continue: true };
        }),
      };

      const stoppingMiddleware = {
        id: "stopping-middleware",
        execute: jest.fn().mockImplementation(async () => {
          sequence.push("stopping");
          return { continue: false };
        }),
      };

      const thirdMiddleware = {
        id: "third-middleware",
        execute: jest.fn().mockImplementation(async () => {
          sequence.push("third");
          return { continue: true };
        }),
      };

      // Register a contract with middleware
      const contract = {
        intent: mockIntent,
        functions: [
          {
            id: "test-function",
            name: "testFunction",
            description: "A test function",
            parameters: {},
            handler: jest.fn(),
          },
        ],
        middleware: [firstMiddleware, stoppingMiddleware, thirdMiddleware],
      };

      framework.registerContract(contract);

      // Process a message
      await framework.process("test message", "conv123");

      // First middleware should run
      expect(firstMiddleware.execute).toHaveBeenCalled();

      // Stopping middleware should run
      expect(stoppingMiddleware.execute).toHaveBeenCalled();

      // Third middleware should not run because stopping middleware returned continue: false
      expect(thirdMiddleware.execute).not.toHaveBeenCalled();

      // Sequence should only include first and stopping, not third
      expect(sequence).toEqual(["first", "stopping"]);
    });
  });
});
