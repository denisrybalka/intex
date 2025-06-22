import OpenAI from "openai";
import {
  BaseIntent,
  IntentDetectionResult,
  IntentFrameworkConfig,
} from "../types";

export async function detectIntentByPattern(
  userMessage: string,
  intents: BaseIntent[],
  confidenceThreshold: number = 0.3
): Promise<IntentDetectionResult | null> {
  let bestMatch: IntentDetectionResult | null = null;
  let highestScore = 0;

  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      const regex = new RegExp(pattern, "i");
      if (regex.test(userMessage)) {
        const score = pattern.length / userMessage.length;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            intent: intent,
            confidence: Math.min(score * 2, 1),
            matchedPattern: pattern,
          };
        }
      }
    }
  }

  return bestMatch && bestMatch.confidence >= confidenceThreshold
    ? bestMatch
    : null;
}

export async function detectIntentByLLM(
  userMessage: string,
  intents: BaseIntent[],
  openai: OpenAI,
  config: IntentFrameworkConfig
): Promise<IntentDetectionResult | null> {
  const intentInfo = intents.map((intent) => ({
    id: intent.id,
    name: intent.name,
    description: intent.description,
    examples: intent.examples,
  }));

  const prompt = `
You are an intent classification system. Given a user message and a list of possible intents, determine which intent best matches the user's message.

User message: "${userMessage}"

Available intents:
${intentInfo
  .map(
    (intent) => `
- ID: ${intent.id}
- Name: ${intent.name}
- Description: ${intent.description}
- Examples: ${intent.examples.join(", ")}
`
  )
  .join("\n")}

Respond with a JSON object containing:
- intentId: the ID of the best matching intent (or null if no good match)
- confidence: a number between 0 and 1 indicating confidence
- reasoning: brief explanation of why this intent was chosen

If no intent matches well (confidence < 0.5), return intentId as null.
`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model || "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    if (
      result.intentId &&
      result.confidence >= (config.intentDetection.confidenceThreshold || 0.5)
    ) {
      const matchedIntent = intents.find(
        (intent) => intent.id === result.intentId
      );
      if (matchedIntent) {
        return {
          intent: matchedIntent,
          confidence: result.confidence,
          matchedPattern: "LLM-based detection",
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`LLM intent detection failed: ${error}`);
    return null;
  }
}
