# Intex: Intent + Context Framework for OpenAI Function Calling

Intex is a TypeScript framework designed to simplify the development of AI-powered applications using OpenAI's Function Calling. It provides a structured way to define intents, organize function calls, and manage conversation context.

## Key Features

- **Intent Detection**: Pattern-based and LLM-based intent recognition
- **Contract-Based Design**: Clear separation of intents, functions, and context
- **Middleware Support**: Add validation, logging, or any custom logic
- **Plugin Architecture**: Extend with analytics, caching, and more
- **Type Safety**: Full TypeScript support with generics
- **Builder Pattern**: Clean, fluent API for defining intents and contracts

## Installation

```bash
npm install intex
```

## Quick Start Example

```typescript
import { 
  createFunction, 
  createIntent, 
  IntentFramework 
} from 'intex';

// 1. Create a function
const getWeatherFunction = createFunction({
  name: "get_weather",
  description: "Get current weather for a location",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City name or location"
      }
    },
    required: ["location"]
  },
  handler: async (params) => {
    // Call your weather API here
    return {
      temperature: 22,
      description: "Sunny",
      location: params.location
    };
  }
});

// 2. Create an intent contract
const weatherContract = createIntent()
  .withId("weather")
  .withName("Weather Information")
  .withDescription("Get weather information for locations")
  .withPatterns(
    "weather.*in.*",
    "what.*is.*the.*weather",
    "temperature.*in.*"
  )
  .withExamples(
    "What is the weather in London?",
    "Show me weather in New York"
  )
  .withFunctions(getWeatherFunction)
  .build();

// 3. Create and configure the framework
const framework = new IntentFramework({
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4"
  },
  intentDetection: {
    strategy: "hybrid"
  },
  logging: {
    enabled: true,
    level: "info"
  }
});

// 4. Register your contract
framework.registerContract(weatherContract);

// 5. Process user messages
const response = await framework.process(
  "What's the weather in Paris?",
  "conversation-123"
);

console.log(response.response); // The LLM response with weather data
```

## Project Structure

```
intex/
├── src/
│   ├── core/               # Core framework functionality
│   ├── builders/           # Builder pattern implementations
│   ├── middleware/         # Built-in middleware components
│   ├── plugins/            # Plugin architecture
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── index.ts            # Main export file
├── examples/               # Example applications
├── tests/                  # Test suite
└── docs/                   # Documentation
```

## Documentation

For more detailed documentation, see the `/docs` directory or visit our [API documentation](https://github.com/denisrybalka/intex).

## Running Examples

```bash
# Run the weather bot example
npm run example:weather

# Run the multi-intent example
npm run example:multi
```

## License

This project is licensed under the terms of the license included with this repository.
