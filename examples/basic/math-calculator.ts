import {
  IntentFramework,
  createIntent,
  createFunction,
  IntentFrameworkConfig,
} from "../../src";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Math Calculator Example
 *
 * This example demonstrates how to build a basic math calculator using the Intent Framework.
 * It showcases how to create intents for different mathematical operations
 * and connect them with functions that perform the calculations.
 */

// Initialize the framework
const config: IntentFrameworkConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key-here",
    model: "gpt-3.5-turbo",
  },
  intentDetection: {
    strategy: "hybrid", // Use both pattern matching and AI
    confidenceThreshold: 0.7,
  },
  logging: {
    enabled: true,
    level: "info",
  },
  storageExtension: null,
};

const framework = new IntentFramework(config);

// Create a basic math operations intent
const mathOperationsIntent = createIntent()
  .withId("math-operations")
  .withName("Basic Mathematical Operations")
  .withDescription(
    "Perform basic mathematical operations like addition, subtraction, multiplication, and division"
  )
  .withPatterns(
    ".*calculate.*",
    ".*what is.*\\d+.*[+\\-*/].*\\d+.*",
    ".*solve.*\\d+.*[+\\-*/].*\\d+.*",
    ".*\\d+\\s*[+\\-*/]\\s*\\d+.*"
  )
  .withExamples(
    "What is 5 + 3?",
    "Calculate 10 * 4",
    "Solve 25 / 5",
    "What's 17 - 9?",
    "7 * 8"
  )
  .build();

// Create an advanced math operations intent
const advancedMathIntent = createIntent()
  .withId("advanced-math")
  .withName("Advanced Mathematical Operations")
  .withDescription(
    "Perform advanced math operations like square root, powers, logarithms, etc."
  )
  .withPatterns(
    ".*square root.*",
    ".*sqrt.*",
    ".*\\d+\\s*squared.*",
    ".*\\d+\\s*cubed.*",
    ".*\\d+\\s*to the power.*",
    ".*log base.*",
    ".*logarithm.*"
  )
  .withExamples(
    "Calculate the square root of 16",
    "What is 5 to the power of 3?",
    "9 squared",
    "27 cubed",
    "What is the log base 10 of 100?",
    "Square root of 144"
  )
  .build();

// Function to calculate basic math operations
const calculateFunction = createFunction({
  name: "calculate",
  description: "Calculate the result of basic mathematical operations",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
        description: "The mathematical operation to perform",
      },
      number1: {
        type: "number",
        description: "First number in the operation",
      },
      number2: {
        type: "number",
        description: "Second number in the operation",
      },
    },
    required: ["operation", "number1", "number2"],
  },
  handler: async (params) => {
    const { operation, number1, number2 } = params;

    switch (operation) {
      case "add":
        return { result: number1 + number2, operation: "addition" };
      case "subtract":
        return { result: number1 - number2, operation: "subtraction" };
      case "multiply":
        return { result: number1 * number2, operation: "multiplication" };
      case "divide":
        if (number2 === 0) {
          throw new Error("Division by zero is not allowed");
        }
        return { result: number1 / number2, operation: "division" };
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
});

// Function for advanced math operations
const advancedMathFunction = createFunction({
  name: "advancedMath",
  description: "Perform advanced mathematical calculations",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["square", "cube", "sqrt", "cbrt", "power", "log"],
        description: "The advanced math operation to perform",
      },
      number: {
        type: "number",
        description: "The number to perform the operation on",
      },
      exponent: {
        type: "number",
        description: "Exponent for power operation (optional)",
      },
      base: {
        type: "number",
        description: "Base for logarithm operation (optional)",
      },
    },
    required: ["operation", "number"],
  },
  handler: async (params) => {
    const { operation, number, exponent, base } = params;

    switch (operation) {
      case "square":
        return { result: number * number, operation: "square" };
      case "cube":
        return { result: number * number * number, operation: "cube" };
      case "sqrt":
        if (number < 0) {
          throw new Error("Cannot calculate square root of negative number");
        }
        return { result: Math.sqrt(number), operation: "square root" };
      case "cbrt":
        return { result: Math.cbrt(number), operation: "cube root" };
      case "power":
        if (exponent === undefined) {
          throw new Error("Exponent required for power operation");
        }
        return { result: Math.pow(number, exponent), operation: "power" };
      case "log":
        if (number <= 0) {
          throw new Error("Cannot calculate logarithm of non-positive number");
        }
        if (base === undefined) {
          return {
            result: Math.log10(number),
            operation: "logarithm (base 10)",
          };
        }
        if (base <= 0 || base === 1) {
          throw new Error("Invalid logarithm base");
        }
        return {
          result: Math.log(number) / Math.log(base),
          operation: `logarithm (base ${base})`,
        };
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
});

// Register the math operations intent with its function
framework.registerContract({
  intent: mathOperationsIntent,
  functions: [calculateFunction],
});

// Register the advanced math intent with its function
framework.registerContract({
  intent: advancedMathIntent,
  functions: [advancedMathFunction],
});

// Example usage
async function main() {
  const conversationId = "math-demo-" + Date.now();

  console.log("\n🧮 Math Calculator Demo");
  console.log("===========================");

  // Process a basic math query and debug intent detection
  const testBasicMath = async (query: string): Promise<void> => {
    console.log(`\n👤 User: ${query}`);
    try {
      const response = await framework.process(query, conversationId);
      console.log(`🤖 Bot: ${response.response}`);

      // Debug info
      console.log(`📊 Intent: ${response.metadata?.intentDetected || "None"}`);
      console.log(
        `📈 Confidence: ${response.metadata?.confidence?.toFixed(2) || "N/A"}`
      );

      if (
        response.executionContext &&
        response.executionContext.functionCalls &&
        response.executionContext.functionCalls.length > 0
      ) {
        const call = response.executionContext.functionCalls[0];
        console.log(`🔧 Function: ${call.functionId}`);
        console.log(`📝 Parameters:`, call.parameters);
        console.log(`🎯 Result:`, call.result);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Error processing '${query}':`, errorMessage);
    }
  };

  // Basic operations
  console.log("\n===== BASIC OPERATIONS =====");
  await testBasicMath("Calculate 25 + 17");
  await testBasicMath("What is 100 - 45?");
  await testBasicMath("10 * 4");
  await testBasicMath("Solve 144 / 12");

  // Advanced operations
  console.log("\n===== ADVANCED OPERATIONS =====");
  await testBasicMath("What is 9 squared?");
  await testBasicMath("Calculate the square root of 81");
  await testBasicMath("2 to the power of 8");
  await testBasicMath("log base 2 of 32");

  // Clean up
  await framework.destroy();
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
