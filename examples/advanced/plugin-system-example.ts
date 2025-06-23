import dotenv from "dotenv";
import { IntentFramework, createIntent, createFunction } from "../../src";
import { LoggingPlugin } from "../plugins/logging-plugin";
import { PerformancePlugin } from "../plugins/performance-plugin";

dotenv.config();

// Example of using the plugin system with the framework
async function main() {
  // Create the framework with plugins
  const framework = new IntentFramework({
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key-here",
      model: "gpt-3.5-turbo",
    },
    intentDetection: {
      strategy: "pattern",
      confidenceThreshold: 0.7,
    },
    logging: {
      enabled: false, // We'll use the plugin for logging instead
    },
    storageExtension: null,
  });

  // Register plugins
  framework.registerPlugin(
    new LoggingPlugin({
      level: "info",
      logToConsole: true,
      logToFile: false,
    })
  );

  framework.registerPlugin(
    new PerformancePlugin({
      measureExecutionTime: true,
      slowOperationThreshold: 1000, // 1 second
      detailedMetrics: true,
    })
  );

  // Create a simple weather intent
  const weatherIntent = createIntent()
    .withId("weather-intent")
    .withName("Weather Information")
    .withDescription("Get weather information for a location")
    .withPatterns(
      "weather in {location}",
      "what's the weather like in {location}"
    )
    .withExamples("What's the weather like in New York?", "Weather in Tokyo")
    .build();

  // Create a simple function to get weather
  const getWeatherFunction = createFunction({
    id: "get-weather",
    name: "getWeather",
    description: "Get the current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The location to get weather for",
        },
      },
      required: ["location"],
    },
    handler: async (params) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const weather = {
        location: params.location,
        temperature: Math.round(15 + Math.random() * 15),
        conditions: ["sunny", "cloudy", "rainy", "snowy"][
          Math.floor(Math.random() * 4)
        ],
        humidity: Math.round(60 + Math.random() * 20),
      };

      return weather;
    },
  });

  // Register the contract
  framework.registerContract({
    intent: weatherIntent,
    functions: [getWeatherFunction],
  });

  // Process a user message - the plugin hooks will be automatically called by the framework
  const userMessage = "What's the weather like in Paris?";
  console.log(`User: ${userMessage}`);

  try {
    // Process the message with the framework
    const response = await framework.process(
      userMessage,
      "demo-conversation",
      "demo-user"
    );

    console.log(`Bot: ${response.response}`);
    console.log(`Execution time: ${response.metadata?.totalExecutionTime}ms`);
  } catch (error) {
    console.error(`Error: ${error}`);
  }

  // Properly shutdown the framework and all plugins
  await framework.shutdown();
}

// Run the example
main().catch(console.error);
