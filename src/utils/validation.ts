import { IntentContract } from "../types/core";

export function validateContract(contract: IntentContract): string[] {
  const errors: string[] = [];

  // Validate intent
  if (!contract.intent) {
    errors.push("Contract is missing intent");
  } else {
    if (!contract.intent.id) {
      errors.push("Intent is missing id");
    }

    if (!contract.intent.name) {
      errors.push("Intent is missing name");
    }

    if (!contract.intent.description) {
      errors.push("Intent is missing description");
    }

    if (!contract.intent.patterns || contract.intent.patterns.length === 0) {
      errors.push("Intent has no patterns defined");
    }

    if (!contract.intent.examples || contract.intent.examples.length === 0) {
      errors.push(
        "Intent has no examples defined - examples help with LLM detection"
      );
    }
  }

  // Validate functions
  if (!contract.functions || contract.functions.length === 0) {
    errors.push("Contract has no functions defined");
  } else {
    contract.functions.forEach((func, index) => {
      if (!func.name) {
        errors.push(`Function at index ${index} is missing name`);
      }

      if (!func.description) {
        errors.push(
          `Function ${func.name || `at index ${index}`} is missing description`
        );
      }

      if (!func.parameters) {
        errors.push(
          `Function ${func.name || `at index ${index}`} is missing parameters`
        );
      }

      if (!func.handler) {
        errors.push(
          `Function ${func.name || `at index ${index}`} is missing handler`
        );
      }
    });
  }

  return errors;
}
