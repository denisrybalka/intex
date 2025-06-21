import { BaseIntent } from "../types/core";

export interface Entity {
  name: string;
  value: string;
  confidence: number;
}

export function extractEntitiesFromPattern(
  userMessage: string,
  intent: BaseIntent
): Record<string, Entity> | null {
  const entities: Record<string, Entity> = {};

  for (const pattern of intent.patterns) {
    // Convert pattern to a regex that captures named parameters
    // Example: "weather in {city}" becomes /weather in (?<city>[a-zA-Z0-9 ]+)/
    const namedParamPattern = pattern.replace(
      /{([^}]+)}/g,
      (_, name) => `(?<${name}>[a-zA-Z0-9 ]+)`
    );

    const regex = new RegExp(namedParamPattern, "i");
    const match = regex.exec(userMessage);

    if (match && match.groups) {
      // We found a match with named groups
      for (const [name, value] of Object.entries(match.groups)) {
        entities[name] = {
          name,
          value: value as string,
          confidence: 0.9, // High confidence for regex matches
        };
      }

      return entities;
    }
  }

  return null;
}

export async function extractEntitiesWithLLM(
  userMessage: string,
  intent: BaseIntent,
  openaiClient: any
): Promise<Record<string, Entity> | null> {
  // This is a simplified example - a real implementation would need to:
  // 1. Extract entity types from the intent patterns
  // 2. Construct a detailed prompt for the LLM
  // 3. Parse the structured response

  const entitiesNeeded: string[] = [];

  // Extract entity names like {entity} from patterns
  for (const pattern of intent.patterns) {
    const entityMatches = pattern.match(/{([^}]+)}/g) || [];
    for (const match of entityMatches) {
      const entityName = match.slice(1, -1); // Remove the brackets
      if (!entitiesNeeded.includes(entityName)) {
        entitiesNeeded.push(entityName);
      }
    }
  }

  if (entitiesNeeded.length === 0) {
    return null;
  }

  try {
    const prompt = `
Extract the following entities from the user message:
${entitiesNeeded.map((e) => `- ${e}`).join("\n")}

User message: "${userMessage}"

Return a JSON object where each key is an entity name and each value is the extracted value.
Only include entities that are actually present in the message.
    `;

    const response = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    try {
      const extractedEntities = JSON.parse(content);

      const entities: Record<string, Entity> = {};
      for (const [name, value] of Object.entries(extractedEntities)) {
        entities[name] = {
          name,
          value: value as string,
          confidence: 0.7, // Medium confidence for LLM extraction
        };
      }

      return entities;
    } catch (error) {
      console.error("Failed to parse LLM entity extraction response:", error);
      return null;
    }
  } catch (error) {
    console.error("Error calling LLM for entity extraction:", error);
    return null;
  }
}
