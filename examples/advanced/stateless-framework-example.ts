import { IntentFramework, createIntent, createFunction } from "../../src";
import { RedisStorageExtension } from "./custom-storage-extension";

// Create a custom storage extension
const redisStorage = new RedisStorageExtension({
  keyPrefix: "my-app:",
  // Add your Redis configuration here
});

// Initialize the framework with the storage extension
const framework = new IntentFramework({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-4-turbo",
  },
  intentDetection: {
    strategy: "hybrid",
    confidenceThreshold: 0.7,
  },
  logging: {
    enabled: true,
    level: "info",
  },
  // Pass the storage extension to the framework
  storageExtension: {
    instance: redisStorage,
  },
});

// You can also create a truly stateless framework without any storage
const statelessFramework = new IntentFramework({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-4-turbo",
  },
  intentDetection: {
    strategy: "hybrid",
    confidenceThreshold: 0.7,
  },
  logging: {
    enabled: true,
    level: "info",
  },
  // Set storageExtension to null for a truly stateless framework
  storageExtension: null,
});

// Create a simple weather intent
const weatherIntent = createIntent()
  .withId("weather-intent")
  .withName("Weather Information")
  .withDescription("Get weather information for a location")
  .withPatterns(
    "What is the weather like in {location}?",
    "Tell me the weather in {location}",
    "Weather forecast for {location}"
  )
  .withExamples(
    "What is the weather like in New York?",
    "Tell me the weather in Paris",
    "Weather forecast for London"
  )
  .build();

// Create a function to get weather data
const getWeatherFunction = createFunction({
  name: "getWeather",
  description: "Get weather information for a location",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The city or location to get weather for",
      },
    },
    required: ["location"],
  },
  handler: async (params) => {
    // Simulate getting weather data
    const { location } = params;

    // In a real app, you would call a weather API here
    return {
      location,
      temperature: Math.floor(Math.random() * 30) + 5,
      condition: ["Sunny", "Cloudy", "Rainy", "Snowy"][
        Math.floor(Math.random() * 4)
      ],
      humidity: Math.floor(Math.random() * 100),
    };
  },
});

// Register the intent and function with the framework
framework.registerContract({
  intent: weatherIntent,
  functions: [getWeatherFunction],
  contextProvider: async () => {
    return {
      id: "weather-context-" + Date.now(),
      data: {
        lastUpdated: new Date().toISOString(),
        availableLocations: ["New York", "London", "Paris", "Tokyo", "Sydney"],
      },
    };
  },
});

// Example usage
async function main() {
  const conversationId = "user-123";

  // Process a user message
  const response = await framework.process(
    "What is the weather like in Paris?",
    conversationId
  );

  console.log("Response:", response.response);

  // Later in the conversation, process another message
  const followUpResponse = await framework.process(
    "And how about in London?",
    conversationId
  );

  console.log("Follow-up response:", followUpResponse.response);

  // When done with the conversation, you can clean it up
  await framework.clearConversationHistory(conversationId);

  // When shutting down the application
  await framework.destroy();
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
