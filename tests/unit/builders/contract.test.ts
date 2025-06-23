import { IntentContractBuilder } from "../../../src/builders/contract";
import { IntentFunction, IntentMiddleware } from "../../../src/types";

describe("IntentContractBuilder", () => {
  const mockIntent = {
    id: "test-intent",
    name: "Test Intent",
    description: "A test intent",
    patterns: ["test pattern"],
    examples: ["test example"],
  };

  const mockFunction: IntentFunction = {
    id: "test-function",
    name: "testFunction",
    description: "A test function",
    parameters: {},
    handler: () => "test result",
  };

  const mockMiddleware: IntentMiddleware = {
    id: "test-middleware",
    execute: async (intent, userMessage, context) => {
      return { continue: true };
    },
  };

  it("should add functions to the contract", () => {
    const contract = {
      intent: mockIntent,
      functions: [],
    };

    const builder = new IntentContractBuilder(contract);
    const result = builder.withFunctions(mockFunction).build();

    expect(result.functions).toHaveLength(1);
    expect(result.functions[0]).toEqual(mockFunction);
  });

  it("should append multiple functions", () => {
    const contract = {
      intent: mockIntent,
      functions: [mockFunction],
    };

    const additionalFunction: IntentFunction = {
      id: "another-function",
      name: "anotherFunction",
      description: "Another test function",
      parameters: {},
      handler: () => "another result",
    };

    const builder = new IntentContractBuilder(contract);
    const result = builder.withFunctions(additionalFunction).build();

    expect(result.functions).toHaveLength(2);
    expect(result.functions).toEqual([mockFunction, additionalFunction]);
  });

  it("should add middleware to the contract", () => {
    const contract = {
      intent: mockIntent,
      functions: [mockFunction],
      middleware: [],
    };

    const builder = new IntentContractBuilder(contract);
    const result = builder.withMiddleware(mockMiddleware).build();

    expect(result.middleware).toHaveLength(1);
    expect(result.middleware?.[0]).toEqual(mockMiddleware);
  });

  it("should append multiple middleware", () => {
    const contract = {
      intent: mockIntent,
      functions: [mockFunction],
      middleware: [mockMiddleware],
    };

    const additionalMiddleware: IntentMiddleware = {
      id: "another-middleware",
      execute: async (intent, userMessage, context) => {
        return { continue: true };
      },
    };

    const builder = new IntentContractBuilder(contract);
    const result = builder.withMiddleware(additionalMiddleware).build();

    expect(result.middleware).toHaveLength(2);
    expect(result.middleware).toEqual([mockMiddleware, additionalMiddleware]);
  });

  it("should support method chaining", () => {
    const contract = {
      intent: mockIntent,
      functions: [],
    };

    const additionalFunction: IntentFunction = {
      id: "another-function",
      name: "anotherFunction",
      description: "Another test function",
      parameters: {},
      handler: () => "another result",
    };

    const builder = new IntentContractBuilder(contract);
    const result = builder
      .withFunctions(mockFunction)
      .withMiddleware(mockMiddleware)
      .withFunctions(additionalFunction)
      .build();

    expect(result.functions).toHaveLength(2);
    expect(result.middleware).toHaveLength(1);
  });

  it("should throw error when building without intent", () => {
    const contract = {
      functions: [mockFunction],
    };

    const builder = new IntentContractBuilder(contract);
    expect(() => builder.build()).toThrow(
      "Contract must have intent and functions"
    );
  });

  it("should throw error when building without functions", () => {
    const contract = {
      intent: mockIntent,
    };

    const builder = new IntentContractBuilder(contract);
    expect(() => builder.build()).toThrow(
      "Contract must have intent and functions"
    );
  });
});
