import { createFunction } from "../../../src/builders/function";

describe("createFunction", () => {
  it("should create a function with provided id", () => {
    const funcDef = {
      id: "test-function",
      name: "testFunction",
      description: "A test function",
      parameters: {},
      handler: () => "test result",
    };

    const result = createFunction(funcDef);

    expect(result).toEqual(funcDef);
    expect(result.id).toBe("test-function");
  });

  it("should use name as id when id is not provided", () => {
    const funcDef = {
      name: "testFunction",
      description: "A test function",
      parameters: {},
      handler: () => "test result",
    };

    const result = createFunction(funcDef);

    expect(result.id).toBe("testFunction");
    expect(result).toEqual({
      id: "testFunction",
      name: "testFunction",
      description: "A test function",
      parameters: {},
      handler: funcDef.handler,
    });
  });
});
