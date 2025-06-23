import dotenv from "dotenv";
import { IntentFramework, createIntent, createFunction } from "../../src";
import { InMemoryStorageExtension } from "../extensions/in-memory-storage-extension";

dotenv.config();

// Create an in-memory storage extension
const inMemoryStorage = new InMemoryStorageExtension({
  id: "example-memory-store",
  name: "Example Memory Storage",
  description: "Simple memory storage for demonstration purposes",
});

// Initialize the framework with the in-memory storage extension
const framework = new IntentFramework({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key-here",
    model: "gpt-3.5-turbo",
  },
  intentDetection: {
    strategy: "hybrid",
    confidenceThreshold: 0.7,
  },
  logging: {
    enabled: true,
    level: "info",
  },
  // Pass the in-memory storage extension to the framework
  storageExtension: {
    instance: inMemoryStorage,
  },
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

// Example usage demonstrating the storage extension
async function main() {
  const conversationId = "user-123";

  // Process a user message
  console.log("Processing first message...");
  const response = await framework.process(
    "What is the weather like in Paris?",
    conversationId
  );
  console.log("Response:", response.response);

  // Check storage status after first message
  console.log(
    "Storage contains conversation:",
    inMemoryStorage.hasConversation(conversationId)
  );
  console.log(
    "Number of conversations in storage:",
    inMemoryStorage.getStorageSize()
  );

  // Process a follow-up message that relies on conversation history
  console.log("\nProcessing follow-up message...");
  const followUpResponse = await framework.process(
    "And how about in London?",
    conversationId
  );
  console.log("Follow-up response:", followUpResponse.response);

  // Process another follow-up to demonstrate conversation memory
  console.log("\nProcessing another follow-up...");
  const anotherFollowUp = await framework.process(
    "Is it colder there than in Paris?",
    conversationId
  );
  console.log("Another follow-up response:", anotherFollowUp.response);

  // Show all conversation IDs in storage
  console.log(
    "\nAll conversation IDs in storage:",
    inMemoryStorage.getAllConversationIds()
  );

  // Show all conversation history in storage
  console.log(
    "\nAll conversation IDs in storage:",
    inMemoryStorage.getConversationHistory(
      inMemoryStorage.getAllConversationIds()[0]
    )
  );

  // Clean up the specific conversation
  console.log("\nClearing conversation history for", conversationId);
  await framework.clearConversationHistory(conversationId);

  // Verify the conversation was removed
  console.log(
    "Storage still contains conversation:",
    inMemoryStorage.hasConversation(conversationId)
  );

  // Create a second conversation to demonstrate multiple conversations
  const secondConversationId = "user-456";
  console.log(
    "\nCreating a second conversation with ID:",
    secondConversationId
  );
  const secondResponse = await framework.process(
    "What's the weather like in Tokyo?",
    secondConversationId
  );
  console.log("Second conversation response:", secondResponse.response);

  // Show storage status with both conversations
  console.log(
    "Number of conversations in storage:",
    inMemoryStorage.getStorageSize()
  );
  console.log("All conversation IDs:", inMemoryStorage.getAllConversationIds());

  // Clear all conversations to demonstrate bulk operations
  console.log("\nClearing all conversations from storage");
  inMemoryStorage.clearAllConversations();
  console.log(
    "Number of conversations after clearing all:",
    inMemoryStorage.getStorageSize()
  );

  // When shutting down the application
  console.log("\nShutting down framework and extensions...");
  await framework.destroy();
}

// Run the example if this file is executed directly
main().catch(console.error);
