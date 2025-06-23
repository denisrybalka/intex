import {
  prepareFunctionTools,
  executeFunctionCalls,
} from "../../../src/core/execution";
import { IntentFunction, ExecutionContext } from "../../../src/types";
import { PluginManager } from "../../../src/plugins";

// Mock the plugin manager
jest.mock("../../../src/plugins", () => {
  return {
    PluginManager: {
      getInstance: jest.fn().mockReturnValue({
        executeHook: jest.fn().mockImplementation(() => Promise.resolve()),
      }),
    },
  };
});

describe("Execution", () => {
  describe("prepareFunctionTools", () => {
    it("should transform functions to OpenAI tool format", () => {
      const testFunctions: IntentFunction[] = [
        {
          id: "getWeather",
          name: "getWeather",
          description: "Get weather information for a location",
          parameters: {
            type: "object",
            properties: {
              location: { type: "string" },
            },
            required: ["location"],
          },
          handler: jest.fn(),
        },
        {
          id: "searchPlaces",
          name: "searchPlaces",
          description: "Search for places of interest",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string" },
              limit: { type: "number" },
            },
            required: ["query"],
          },
          handler: jest.fn(),
        },
      ];

      const tools = prepareFunctionTools(testFunctions);

      expect(tools).toHaveLength(2);
      expect(tools[0].type).toBe("function");
      expect(tools[0].function.name).toBe("getWeather");
      expect(tools[0].function.description).toBe(
        "Get weather information for a location"
      );
      expect(tools[0].function.parameters).toEqual(testFunctions[0].parameters);

      expect(tools[1].type).toBe("function");
      expect(tools[1].function.name).toBe("searchPlaces");
      expect(tools[1].function.description).toBe(
        "Search for places of interest"
      );
      expect(tools[1].function.parameters).toEqual(testFunctions[1].parameters);
    });
  });

  describe("executeFunctionCalls", () => {
    let mockLogger: jest.Mock;
    let mockExecutionContext: ExecutionContext;
    let testFunctions: IntentFunction[];
    let mockPluginManager: any;

    beforeEach(() => {
      mockLogger = jest.fn();
      mockExecutionContext = {
        conversationId: "test-convo",
        userMessage: "test message",
        functionCalls: [],
        messages: [],
      };

      testFunctions = [
        {
          id: "getWeather",
          name: "getWeather",
          description: "Get weather information",
          parameters: {
            type: "object",
            properties: {
              location: { type: "string" },
            },
            required: ["location"],
          },
          handler: jest
            .fn()
            .mockImplementation(() =>
              Promise.resolve({ temperature: 25, condition: "sunny" })
            ),
        },
        {
          id: "requiresContextFn",
          name: "requiresContextFn",
          description: "Function that requires context",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string" },
            },
            required: ["query"],
          },
          handler: jest.fn().mockImplementation((params: any, context: any) => {
            return { query: params.query, contextData: context?.data };
          }),
          requiresContext: true,
        },
      ];

      mockPluginManager = PluginManager.getInstance();
    });

    it("should execute function calls successfully", async () => {
      const toolCalls = [
        {
          id: "call1",
          function: {
            name: "getWeather",
            arguments: JSON.stringify({ location: "London" }),
          },
        },
      ];

      await executeFunctionCalls(
        toolCalls,
        testFunctions,
        mockExecutionContext,
        mockLogger
      );

      // Check if the function was called with correct params
      expect(testFunctions[0].handler).toHaveBeenCalledWith(
        { location: "London" },
        undefined
      );

      // Check if the function call was recorded
      expect(mockExecutionContext.functionCalls).toHaveLength(1);
      expect(mockExecutionContext.functionCalls![0].functionId).toBe("call1");
      expect(mockExecutionContext.functionCalls![0].parameters).toEqual({
        location: "London",
      });
      expect(mockExecutionContext.functionCalls![0].result).toEqual({
        temperature: 25,
        condition: "sunny",
      });
      expect(
        mockExecutionContext.functionCalls![0].executionTime
      ).toBeDefined();

      // Check if the plugin hooks were called
      expect(mockPluginManager.executeHook).toHaveBeenCalledWith(
        "onBeforeFunctionExecution",
        mockExecutionContext,
        "getWeather",
        { location: "London" }
      );
      expect(mockPluginManager.executeHook).toHaveBeenCalledWith(
        "onAfterFunctionExecution",
        mockExecutionContext,
        "getWeather",
        { temperature: 25, condition: "sunny" }
      );
    });

    it("should handle errors in function execution", async () => {
      const errorFunction: IntentFunction = {
        id: "errorFn",
        name: "errorFn",
        description: "Function that throws an error",
        parameters: {},
        handler: jest
          .fn()
          .mockImplementation(() => Promise.reject(new Error("Test error"))),
      };

      const toolCalls = [
        {
          id: "errorCall",
          function: {
            name: "errorFn",
            arguments: "{}",
          },
        },
      ];

      await executeFunctionCalls(
        [...toolCalls],
        [...testFunctions, errorFunction],
        mockExecutionContext,
        mockLogger
      );

      // Check if error was logged
      expect(mockLogger).toHaveBeenCalledWith(
        "error",
        expect.stringContaining("errorFn failed")
      );

      // Check if error was recorded in function call
      expect(mockExecutionContext.functionCalls).toHaveLength(1);
      expect(mockExecutionContext.functionCalls![0].error).toBe("Test error");

      // Check if the error hook was called
      expect(mockPluginManager.executeHook).toHaveBeenCalledWith(
        "onAfterFunctionExecution",
        mockExecutionContext,
        "errorFn",
        null,
        "Test error"
      );
    });

    it("should pass context to functions that require it", async () => {
      mockExecutionContext.injectedContext = {
        id: "test-context",
        data: { userId: "user123", preferences: { units: "metric" } },
      };

      const toolCalls = [
        {
          id: "contextCall",
          function: {
            name: "requiresContextFn",
            arguments: JSON.stringify({ query: "test query" }),
          },
        },
      ];

      await executeFunctionCalls(
        toolCalls,
        testFunctions,
        mockExecutionContext,
        mockLogger
      );

      // Check if the function was called with context
      expect(testFunctions[1].handler).toHaveBeenCalledWith(
        { query: "test query" },
        mockExecutionContext.injectedContext
      );

      // Check if the result includes data from context
      expect(mockExecutionContext.functionCalls![0].result).toEqual({
        query: "test query",
        contextData: { userId: "user123", preferences: { units: "metric" } },
      });
    });

    it("should handle functions not found", async () => {
      const toolCalls = [
        {
          id: "unknownCall",
          function: {
            name: "nonExistentFunction",
            arguments: "{}",
          },
        },
      ];

      await executeFunctionCalls(
        toolCalls,
        testFunctions,
        mockExecutionContext,
        mockLogger
      );

      // Check if error was logged
      expect(mockLogger).toHaveBeenCalledWith(
        "error",
        "Function nonExistentFunction not found"
      );

      // Check that no function calls were recorded
      expect(mockExecutionContext.functionCalls).toHaveLength(0);
    });
  });
});
