import dotenv from "dotenv";
import {
  createFunction,
  createIntent,
  IntentFramework,
  IntentFrameworkConfig,
} from "../../src";
import { createLoggingMiddleware } from "../middleware/logging";

async function runWeatherBotExample() {
  console.log("🚀 Starting Weather Bot Example...\n");

  // Configuration
  const config: IntentFrameworkConfig = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key-here",
      model: "gpt-4",
      temperature: 0.7,
    },
    intentDetection: {
      strategy: "hybrid",
      confidenceThreshold: 0.6,
      fallbackToLLM: true,
    },
    logging: {
      enabled: true,
      level: "info",
    },
    contextRetention: {
      enabled: true,
      maxContexts: 5,
    },
    storageExtension: null,
  };

  // Create framework instance
  const framework = new IntentFramework(config);

  // Create a weather function
  const getWeatherFunction = createFunction<
    { location: string },
    { temperature: number; description: string; location: string }
  >({
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City name or location",
        },
      },
      required: ["location"],
    },
    handler: async (params) => {
      // Simulate weather API call
      const temperatures: Record<string, number> = {
        "new york": 22,
        london: 15,
        tokyo: 28,
        paris: 18,
      };
      const descriptions = ["Sunny", "Partly cloudy", "Rainy", "Clear"];

      const locationKey = params.location.toLowerCase();
      const temp =
        (locationKey in temperatures ? temperatures[locationKey] : undefined) ||
        Math.floor(Math.random() * 30);
      const desc =
        descriptions[Math.floor(Math.random() * descriptions.length)];

      return {
        temperature: temp,
        description: desc,
        location: params.location,
      };
    },
  });

  // Create a weather intent contract
  const weatherContract = createIntent()
    .withId("weather")
    .withName("Weather Information")
    .withDescription("Get weather information for locations")
    .withPatterns(
      "weather.*in.*",
      "what.*is.*the.*weather",
      "temperature.*in.*",
      "how.*is.*the.*weather"
    )
    .withExamples(
      "What is the weather in London?",
      "Show me weather in New York",
      "Temperature in Tokyo",
      "How is the weather in Paris?"
    )
    .withFunctions(getWeatherFunction)
    .withMiddleware(createLoggingMiddleware())
    .build();

  // Register the contract
  framework.registerContract(weatherContract);

  // Test the bot with some messages
  const testMessages = [
    "What is the weather in New York?",
    "How is the weather in Tokyo?",
    "Tell me the temperature in Paris",
    "What's the weather like in London?",
  ];

  console.log("🤖 Weather Bot is ready to respond!\n");

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    const conversationId = `conv_${i + 1}`;

    console.log(`👤 User: ${message}`);

    try {
      const response = await framework.process(
        message,
        conversationId,
        "test_user"
      );

      console.log(`🤖 Bot: ${response.response}`);
      console.log(`📊 Metadata:`, {
        intentDetected: response.metadata.intentDetected,
        functionsExecuted: response.metadata.functionsExecuted,
        executionTime: `${response.metadata.totalExecutionTime}ms`,
        confidence: response.metadata.confidence?.toFixed(2),
      });

      if (
        response.executionContext.functionCalls &&
        response.executionContext.functionCalls.length > 0
      ) {
        console.log(`🔧 Function calls:`);
        response.executionContext.functionCalls.forEach((call) => {
          console.log(
            `  - ${call.functionId}: ${call.result ? "Success" : "Failed"} (${
              call.executionTime
            }ms)`
          );
          if (call.result) {
            console.log(`    Result:`, call.result);
          }
          if (call.error) {
            console.log(`    Error:`, call.error);
          }
        });
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }

    console.log("\n" + "─".repeat(60) + "\n");
  }

  console.log("✅ Weather Bot example completed!");

  // Cleanup
  await framework.destroy();
}

// Run the example
if (require.main === module) {
  dotenv.config();

  runWeatherBotExample()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Example failed:", error);
      process.exit(1);
    });
}
