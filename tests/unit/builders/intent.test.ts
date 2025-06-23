import { IntentBuilder } from "../../../src/builders/intent";
import { IntentContractBuilder } from "../../../src/builders/contract";

describe("IntentBuilder", () => {
  let builder: IntentBuilder;

  beforeEach(() => {
    builder = new IntentBuilder();
  });

  it("should set intent id correctly", () => {
    // Set all required fields, then verify the specific one we're testing
    const intent = builder
      .withId("test-id")
      .withName("Test Intent") // Required
      .withDescription("Test Description") // Required
      .build();
    expect(intent.id).toBe("test-id");
  });

  it("should set intent name correctly", () => {
    // Set all required fields, then verify the specific one we're testing
    const intent = builder
      .withId("test-id") // Required
      .withName("Test Intent")
      .withDescription("Test Description") // Required
      .build();
    expect(intent.name).toBe("Test Intent");
  });

  it("should return IntentContractBuilder with withContext", () => {
    const contextProvider = () =>
      Promise.resolve({ id: "ctx1", data: { test: true } });
    const contractBuilder = builder
      .withId("test")
      .withName("Test")
      .withDescription("Description")
      .withContext(contextProvider)
      .build();

    expect(contractBuilder.contextProvider).toBe(contextProvider);
  });

  it("should set intent description correctly", () => {
    // Set all required fields, then verify the specific one we're testing
    const intent = builder
      .withId("test-id") // Required
      .withName("Test Intent") // Required
      .withDescription("This is a test intent")
      .build();
    expect(intent.description).toBe("This is a test intent");
  });

  it("should add patterns correctly", () => {
    // Set required fields first
    builder
      .withId("test-id")
      .withName("Test Intent")
      .withDescription("Test Description")
      .withPatterns("pattern1", "pattern2");

    let intent = builder.build();
    expect(intent.patterns).toEqual(["pattern1", "pattern2"]);

    // Add more patterns
    builder.withPatterns("pattern3");
    intent = builder.build();
    expect(intent.patterns).toEqual(["pattern1", "pattern2", "pattern3"]);
  });

  it("should add examples correctly", () => {
    // Set required fields first
    builder
      .withId("test-id")
      .withName("Test Intent")
      .withDescription("Test Description")
      .withExamples("example1", "example2");

    let intent = builder.build();
    expect(intent.examples).toEqual(["example1", "example2"]);

    // Add more examples
    builder.withExamples("example3");
    intent = builder.build();
    expect(intent.examples).toEqual(["example1", "example2", "example3"]);
  });

  it("should throw error when building without required fields", () => {
    expect(() => builder.build()).toThrow(
      "Intent must have id, name, and description"
    );

    builder.withId("test-id");
    expect(() => builder.build()).toThrow(
      "Intent must have id, name, and description"
    );

    builder.withName("Test Intent");
    expect(() => builder.build()).toThrow(
      "Intent must have id, name, and description"
    );

    builder.withDescription("Test description");
    expect(() => builder.build()).not.toThrow();
  });

  it("should build a complete intent object", () => {
    const intent = builder
      .withId("weather")
      .withName("Weather Intent")
      .withDescription("Get weather information")
      .withPatterns("what is the weather", "weather forecast")
      .withExamples("What is the weather in New York?")
      .build();

    expect(intent).toEqual({
      id: "weather",
      name: "Weather Intent",
      description: "Get weather information",
      patterns: ["what is the weather", "weather forecast"],
      examples: ["What is the weather in New York?"],
    });
  });

  it("should return IntentContractBuilder with withFunctions", () => {
    const testFunction = {
      id: "func1",
      name: "testFunc",
      description: "A test function",
      parameters: {},
      handler: () => "test",
    };

    const contractBuilder = builder
      .withId("test")
      .withName("Test")
      .withDescription("Description")
      .withFunctions(testFunction);

    expect(contractBuilder).toBeInstanceOf(IntentContractBuilder);
  });
});
