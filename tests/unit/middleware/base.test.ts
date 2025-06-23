import { createMiddleware } from "../../../src/middleware/base";
import { BaseIntent, IntentContext } from "../../../src/types";

describe("Middleware", () => {
  it("should create a middleware with id and execute function", () => {
    const middleware = createMiddleware("test-middleware", async () => ({
      continue: true,
    }));

    expect(middleware.id).toBe("test-middleware");
    expect(typeof middleware.execute).toBe("function");
  });

  it("should allow middleware execution to continue", async () => {
    const middleware = createMiddleware("continue-middleware", async () => ({
      continue: true,
    }));

    const mockIntent: BaseIntent = {
      id: "test-intent",
      name: "Test Intent",
      description: "A test intent",
      patterns: ["pattern"],
      examples: [],
    };

    const result = await middleware.execute(mockIntent, "test message");

    expect(result.continue).toBe(true);
    expect(result.modifiedContext).toBeUndefined();
  });

  it("should allow middleware execution to stop", async () => {
    const middleware = createMiddleware("stop-middleware", async () => ({
      continue: false,
    }));

    const mockIntent: BaseIntent = {
      id: "test-intent",
      name: "Test Intent",
      description: "A test intent",
      patterns: ["pattern"],
      examples: [],
    };

    const result = await middleware.execute(mockIntent, "test message");

    expect(result.continue).toBe(false);
  });

  it("should allow middleware to modify context", async () => {
    const modifiedContext: IntentContext = {
      id: "modified-context",
      data: { modified: true },
    };

    const middleware = createMiddleware("context-modifier", async () => ({
      continue: true,
      modifiedContext,
    }));

    const mockIntent: BaseIntent = {
      id: "test-intent",
      name: "Test Intent",
      description: "A test intent",
      patterns: ["pattern"],
      examples: [],
    };

    const inputContext: IntentContext = {
      id: "original-context",
      data: { original: true },
    };

    const result = await middleware.execute(
      mockIntent,
      "test message",
      inputContext
    );

    expect(result.continue).toBe(true);
    expect(result.modifiedContext).toBe(modifiedContext);
    expect(result.modifiedContext?.id).toBe("modified-context");
    expect(result.modifiedContext?.data).toEqual({ modified: true });
  });
});
