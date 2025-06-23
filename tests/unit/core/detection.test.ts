import {
  detectIntentByPattern,
  detectIntentByLLM,
} from "../../../src/core/detection";
import { BaseIntent, IntentFrameworkConfig } from "../../../src/types";
import OpenAI from "openai";

jest.mock("openai");

describe("Intent Detection", () => {
  describe("detectIntentByPattern", () => {
    const testIntents: BaseIntent[] = [
      {
        id: "weather",
        name: "Weather Intent",
        description: "Get weather information",
        patterns: [
          "weather in (.*)",
          "what is the weather like",
          "forecast for (.*)",
        ],
        examples: ["What is the weather like in London?"],
      },
      {
        id: "greeting",
        name: "Greeting Intent",
        description: "Handle greetings",
        patterns: ["hello", "hi", "hey", "greetings"],
        examples: ["Hello, how are you?"],
      },
    ];

    it("should detect intent based on exact pattern match", async () => {
      const message = "hello there";
      const result = await detectIntentByPattern(message, testIntents);

      expect(result).not.toBeNull();
      expect(result?.intent.id).toBe("greeting");
      expect(result?.matchedPattern).toBe("hello");
    });

    it("should detect intent based on regex pattern", async () => {
      const message = "weather in New York";
      const result = await detectIntentByPattern(message, testIntents);

      expect(result).not.toBeNull();
      expect(result?.intent.id).toBe("weather");
      expect(result?.matchedPattern).toBe("weather in (.*)");
    });

    it("should return null when no pattern matches", async () => {
      const message = "book a flight to Paris";
      const result = await detectIntentByPattern(message, testIntents);

      expect(result).toBeNull();
    });

    it("should respect confidence threshold", async () => {
      // With a message that should match with normal threshold (0.3)
      // Using a shorter message so the confidence calculation works properly
      const result1 = await detectIntentByPattern("hello there", testIntents);
      expect(result1?.intent.id).toBe("greeting");

      // With higher threshold
      // The pattern "hello" in "hello there" creates a confidence score higher than 0.9
      // Let's use a much longer message to reduce confidence
      const result2 = await detectIntentByPattern(
        "this is a very long message that contains the word hello somewhere in the middle but should be below confidence threshold",
        testIntents,
        0.2 // Even with a low threshold, the confidence should be very low due to message length
      );
      expect(result2).toBeNull();
    });

    it("should select pattern with highest score when multiple matches", async () => {
      const message = "what is the weather like in Paris";
      const result = await detectIntentByPattern(message, testIntents);

      expect(result?.intent.id).toBe("weather");
      expect(result?.matchedPattern).toBe("what is the weather like");
    });
  });

  describe("detectIntentByLLM", () => {
    const testIntents: BaseIntent[] = [
      {
        id: "weather",
        name: "Weather Intent",
        description: "Get weather information",
        patterns: ["weather in (.*)"],
        examples: [
          "What is the weather like in London?",
          "Will it rain tomorrow?",
        ],
      },
      {
        id: "greeting",
        name: "Greeting Intent",
        description: "Handle greetings",
        patterns: ["hello"],
        examples: ["Hello, how are you?", "Hi there!"],
      },
    ];

    const mockConfig: IntentFrameworkConfig = {
      openai: {
        apiKey: "test-key",
        model: "test-model",
      },
      intentDetection: {
        strategy: "llm",
        confidenceThreshold: 0.5,
      },
      storageExtension: null,
    };

    let mockOpenAI: jest.Mocked<OpenAI>;

    beforeEach(() => {
      mockOpenAI = new OpenAI({ apiKey: "test" }) as jest.Mocked<OpenAI>;

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockImplementation(() =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      intentId: "weather",
                      confidence: 0.8,
                      reasoning: "The user is asking about weather",
                    }),
                  },
                },
              ],
            })
          ),
        },
      } as any;
    });

    it("should detect intent using LLM", async () => {
      const message = "Will it be sunny in Paris tomorrow?";

      const result = await detectIntentByLLM(
        message,
        testIntents,
        mockOpenAI,
        mockConfig
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.intent.id).toBe("weather");
      expect(result?.confidence).toBe(0.8);
      expect(result?.matchedPattern).toBe("LLM-based detection");
    });

    it("should return null when LLM confidence is below threshold", async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockImplementationOnce(
        () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    intentId: "weather",
                    confidence: 0.3, // Below the 0.5 threshold
                    reasoning: "Not very confident",
                  }),
                },
              },
            ],
          })
      );

      const message = "What about tomorrow?";
      const result = await detectIntentByLLM(
        message,
        testIntents,
        mockOpenAI,
        mockConfig
      );

      expect(result).toBeNull();
    });

    it("should return null when LLM returns invalid JSON", async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockImplementationOnce(
        () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: "Not a valid JSON",
                },
              },
            ],
          })
      );

      const message = "What about the weather in London?";
      const result = await detectIntentByLLM(
        message,
        testIntents,
        mockOpenAI,
        mockConfig
      );

      expect(result).toBeNull();
    });

    it("should return null when LLM API call fails", async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockImplementationOnce(
        () => Promise.reject(new Error("API error"))
      );

      const message = "What about the weather in London?";
      const result = await detectIntentByLLM(
        message,
        testIntents,
        mockOpenAI,
        mockConfig
      );

      expect(result).toBeNull();
    });
  });
});
