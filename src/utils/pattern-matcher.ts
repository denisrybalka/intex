import { BaseIntent } from "../types/core";

export interface PatternMatchResult {
  intent: BaseIntent;
  confidence: number;
  matchedPattern: string;
  matchGroups?: string[];
}

/**
 * Simple pattern matching using regular expressions
 */
export function matchPattern(
  userMessage: string,
  intents: BaseIntent[],
  confidenceThreshold: number = 0.3
): PatternMatchResult | null {
  const lowerMessage = userMessage.toLowerCase();
  let bestMatch: PatternMatchResult | null = null;
  let highestScore = 0;

  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      const regex = new RegExp(pattern, "i");
      const match = regex.test(userMessage);

      if (match) {
        // Calculate a confidence score based on pattern specificity
        // Longer patterns are considered more specific/confident
        const score = pattern.length / userMessage.length;

        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            intent: intent,
            confidence: Math.min(score * 2, 1), // Scale up but cap at 1.0
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

/**
 * Advanced pattern matching with support for capturing groups
 */
export function matchPatternWithGroups(
  userMessage: string,
  intents: BaseIntent[]
): PatternMatchResult | null {
  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      try {
        const regex = new RegExp(pattern, "i");
        const match = userMessage.match(regex);

        if (match) {
          // Extract any capture groups from the regex
          const groups = match.slice(1);

          return {
            intent,
            confidence: 0.9, // High confidence for exact regex matches
            matchedPattern: pattern,
            matchGroups: groups,
          };
        }
      } catch (error) {
        console.error(
          `Invalid regex pattern in intent ${intent.id}:`,
          pattern,
          error
        );
      }
    }
  }

  return null;
}

/**
 * Fuzzy pattern matching for more flexible matching
 */
export function fuzzyMatchPattern(
  userMessage: string,
  intents: BaseIntent[],
  threshold: number = 0.7
): PatternMatchResult | null {
  // This is a simplified implementation
  // In a real app, you would use a proper fuzzy matching library
  const words = userMessage.toLowerCase().split(/\s+/);

  let bestScore = 0;
  let bestMatch: PatternMatchResult | null = null;

  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      const patternWords = pattern.toLowerCase().split(/\s+/);

      // Count how many words from the pattern appear in the message
      let matchingWords = 0;
      for (const patternWord of patternWords) {
        if (words.includes(patternWord)) {
          matchingWords++;
        }
      }

      const score = matchingWords / patternWords.length;

      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = {
          intent,
          confidence: score,
          matchedPattern: pattern,
        };
      }
    }
  }

  return bestMatch;
}
