# Intex: Intent + Context Framework for OpenAI Function Calling

Intex is a TypeScript framework designed to simplify the development of AI-powered applications using OpenAI's Function Calling. It provides a structured way to define intents, organize function calls, and manage conversation context.

[![npm version](https://img.shields.io/npm/v/intex.svg)](https://www.npmjs.com/package/intex)
[![License](https://img.shields.io/github/license/denisrybalka/intex)](https://github.com/denisrybalka/intex/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue)](https://www.typescriptlang.org/)

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Core Concepts](#-core-concepts)
- [Examples](#-examples)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- **Intent Detection**: Flexible intent recognition using pattern-based matching and/or LLM-based detection
- **Contract-Based Design**: Clear separation of intents, functions, and context
- **Middleware Support**: Add validation, authentication, logging, or any custom processing logic
- **Plugin Architecture**: Easily extend the framework with analytics, logging, performance tracking, and more
- **Storage Extensions**: Flexible storage options for maintaining conversation state and context
- **Type Safety**: Full TypeScript support with generics for end-to-end type checking
- **Builder Pattern**: Clean, fluent API for defining intents and functions

## 📦 Installation

```bash
npm install intex
```

Or using yarn:

```bash
yarn add intex
```

## 🚀 Quick Start

Here's a basic example of creating a weather information application:

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
    model: "gpt-3.5-turbo"
  },
  intentDetection: {
    strategy: "hybrid" // Use both pattern matching and LLM
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

## 🏗️ Architecture

Intex is built around several key architectural components:

- **Intent Framework**: Core component that manages intents and handles request processing
- **Builders**: Fluent interfaces for creating intents and functions
- **Middleware**: Pluggable components that modify the processing pipeline
- **Extensions**: Modular components that add functionality to the framework
- **Plugins**: Self-contained modules that can monitor and interact with the framework

## 🧩 Core Concepts

### Intents and Function Contracts

Intents represent user goals, while function contracts define the operations available to fulfill those goals.

### Middleware

Middleware components allow you to intercept and modify the processing flow at different points. Common uses include:

- Authentication and authorization
- Rate limiting
- Request validation
- Logging and monitoring

### Plugins

Plugins provide a way to extend the framework with additional functionality such as:

- Performance monitoring
- Analytics tracking
- Advanced logging
- Custom behaviors

### Storage Extensions

Storage extensions allow you to persist conversation context and state across user interactions:

- In-memory storage for testing
- Custom storage implementations for production use

## 📚 Examples

The repository includes examples demonstrating various framework capabilities:

### Basic Examples
- [Weather Bot](/examples/basic/weather-bot.ts): Simple weather information application
- [Math Calculator](/examples/basic/math-calculator.ts): Mathematical operations using intents

### Advanced Examples
- [Plugin System](/examples/advanced/plugin-system-example.ts): Using the plugin architecture
- [Storage Extensions](/examples/advanced/storage-extensions-example.ts): Working with context storage

### Middleware Examples
- [Authentication](/examples/middleware/auth.ts): Implementing authentication middleware
- [Logging](/examples/middleware/logging.ts): Request logging middleware
- [Rate Limiting](/examples/middleware/rate-limit.ts): Controlling request frequency

To run an example:

```bash
# Run the weather bot example
npm run example:weather

# Run the math calculator example
npm run example:math

# Run the storage extension example
npm run example:storage-extension
```

## 📖 Documentation

For comprehensive documentation on all aspects of the framework, please refer to:

- [Core Concepts](/docs/core-concepts.md)
- [Intent Definition Guide](/docs/intent-definition.md)
- [Function Creation](/docs/function-creation.md)
- [Middleware Development](/docs/middleware.md)
- [Plugin System](/docs/plugins.md)
- [Storage Extensions](/docs/storage-extensions.md)
- [Advanced Usage](/docs/advanced-usage.md)
- [API Reference](/docs/api-reference.md)

## 👨‍💻 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the terms of the license included with this repository.
