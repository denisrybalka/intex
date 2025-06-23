import { Plugin } from "../../../src/types";
import { PluginManager } from "../../../src/plugins";
import { ExecutionContext } from "../../../src/types/core";

describe("PluginManager", () => {
  let pluginManager: PluginManager;
  let testPlugin: Plugin;
  let testPlugin2: Plugin;
  let mockConsoleError: any;

  beforeEach(() => {
    // Get a fresh instance for each test
    // Note: We're using a hack to reset the singleton for testing purposes
    // @ts-ignore - Accessing private static property for testing
    PluginManager["instance"] = undefined;
    pluginManager = PluginManager.getInstance();

    // Create test plugins with type assertions to satisfy TypeScript
    testPlugin = {
      id: "test-plugin",
      name: "Test Plugin",
      description: "A plugin for testing",
      initialize: jest.fn(),
      shutdown: jest.fn(),
    } as Plugin;

    testPlugin2 = {
      id: "test-plugin-2",
      name: "Test Plugin 2",
      description: "Another plugin for testing",
      initialize: jest.fn(),
      shutdown: jest.fn(),
      priority: 10, // Higher priority
    } as Plugin;

    // Mock console.error to prevent test logs
    mockConsoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    // @ts-ignore - Resetting the singleton after tests
    PluginManager["instance"] = undefined;
  });

  describe("Singleton pattern", () => {
    it("should return the same instance when getInstance is called multiple times", () => {
      const instance1 = PluginManager.getInstance();
      const instance2 = PluginManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("Plugin registration and retrieval", () => {
    it("should register a plugin correctly", () => {
      pluginManager.registerPlugin(testPlugin);

      const retrievedPlugin = pluginManager.getPlugin(testPlugin.id);
      expect(retrievedPlugin).toBe(testPlugin);
    });

    it("should throw error when registering a plugin with duplicate ID", () => {
      pluginManager.registerPlugin(testPlugin);

      expect(() => {
        pluginManager.registerPlugin({ ...testPlugin });
      }).toThrow(`Plugin with ID ${testPlugin.id} is already registered`);
    });

    it("should unregister a plugin correctly", () => {
      pluginManager.registerPlugin(testPlugin);

      const result = pluginManager.unregisterPlugin(testPlugin.id);
      expect(result).toBe(true);

      const retrievedPlugin = pluginManager.getPlugin(testPlugin.id);
      expect(retrievedPlugin).toBeUndefined();
    });

    it("should return false when trying to unregister a non-existent plugin", () => {
      const result = pluginManager.unregisterPlugin("non-existent");
      expect(result).toBe(false);
    });

    it("should get all registered plugins", () => {
      pluginManager.registerPlugin(testPlugin);
      pluginManager.registerPlugin(testPlugin2);

      const plugins = pluginManager.getAllPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(testPlugin);
      expect(plugins).toContain(testPlugin2);
    });
  });

  describe("Plugin lifecycle management", () => {
    it("should initialize all plugins", async () => {
      pluginManager.registerPlugin(testPlugin);
      pluginManager.registerPlugin(testPlugin2);

      await pluginManager.initialize();

      expect(testPlugin.initialize).toHaveBeenCalled();
      expect(testPlugin2.initialize).toHaveBeenCalled();
    });

    it("should shutdown all plugins", async () => {
      pluginManager.registerPlugin(testPlugin);
      pluginManager.registerPlugin(testPlugin2);

      await pluginManager.shutdown();

      expect(testPlugin.shutdown).toHaveBeenCalled();
      expect(testPlugin2.shutdown).toHaveBeenCalled();
    });
  });

  describe("Plugin hooks execution", () => {
    it("should execute hooks on registered plugins", async () => {
      const context = {
        conversationId: "test",
        userMessage: "hello",
        messages: [],
      };

      const pluginWithHook = {
        ...testPlugin,
        onBeforeIntentDetection: jest.fn(),
      } as Plugin;

      pluginManager.registerPlugin(pluginWithHook);
      await pluginManager.executeHook("onBeforeIntentDetection", context);

      expect(pluginWithHook.onBeforeIntentDetection).toHaveBeenCalledWith(
        context
      );
    });

    it("should execute hooks in priority order (higher first)", async () => {
      const executionOrder: number[] = [];

      const lowPriorityPlugin = {
        ...testPlugin,
        id: "low-priority",
        priority: 1,
        onBeforeIntentDetection: jest.fn().mockImplementation(async () => {
          executionOrder.push(1);
        }) as unknown as (context: ExecutionContext) => Promise<void>,
      } as Plugin;

      const highPriorityPlugin = {
        ...testPlugin2,
        id: "high-priority",
        priority: 10,
        onBeforeIntentDetection: jest.fn().mockImplementation(async () => {
          executionOrder.push(10);
        }) as unknown as (context: ExecutionContext) => Promise<void>,
      } as Plugin;

      pluginManager.registerPlugin(lowPriorityPlugin);
      pluginManager.registerPlugin(highPriorityPlugin);

      await pluginManager.executeHook("onBeforeIntentDetection", {
        conversationId: "test",
        userMessage: "hello",
        messages: [],
      });

      expect(executionOrder).toEqual([10, 1]);
    });

    it("should respect plugin dependencies", async () => {
      const executionOrder: string[] = [];

      const dependentPlugin = {
        ...testPlugin,
        id: "dependent",
        dependencies: ["dependency"],
        onBeforeIntentDetection: jest.fn().mockImplementation(async () => {
          executionOrder.push("dependent");
        }) as unknown as (context: ExecutionContext) => Promise<void>,
      } as Plugin;

      const dependencyPlugin = {
        ...testPlugin2,
        id: "dependency",
        onBeforeIntentDetection: jest.fn().mockImplementation(async () => {
          executionOrder.push("dependency");
        }) as unknown as (context: ExecutionContext) => Promise<void>,
      } as Plugin;

      // Register in reverse order to ensure dependencies are respected
      pluginManager.registerPlugin(dependentPlugin);
      pluginManager.registerPlugin(dependencyPlugin);

      await pluginManager.executeHook("onBeforeIntentDetection", {
        conversationId: "test",
        userMessage: "hello",
        messages: [],
      });

      // Dependency should execute first
      expect(executionOrder[0]).toBe("dependency");
      expect(executionOrder[1]).toBe("dependent");
    });
  });
});
