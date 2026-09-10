export type ComplexityTier = "simple" | "standard" | "complex" | "reasoning";

/**
 * Classifies the complexity of a prompt based on purely fast heuristics.
 * Evaluates length, presence of code blocks, and reasoning keywords.
 */
export function classifyPromptComplexity(messages: any[]): ComplexityTier {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "simple";
  }

  let totalLength = 0;
  let codeBlocksCount = 0;
  let hasMathOrLogic = false;
  let hasReasoningKeywords = false;
  let lastUserContent = "";

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;
    
    let contentStr = "";
    if (typeof msg.content === "string") {
      contentStr = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Multimodal parts
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          contentStr += part.text;
        }
      }
    }

    if (!contentStr) continue;
    
    if (msg.role !== "system") {
      totalLength += contentStr.length;
    }
    
    if (msg.role === "user") {
      lastUserContent = contentStr;
      
      // Heuristics checks only on user messages to avoid triggering on system prompt examples
      if (contentStr.includes("```")) {
        codeBlocksCount++;
      }
      
      // Math/Logic
      if (
        contentStr.includes("\\sum") || 
        contentStr.includes("\\int") || 
        contentStr.includes("theorem") ||
        contentStr.includes("equation")
      ) {
        hasMathOrLogic = true;
      }
      
      // Reasoning
      const lowerContent = contentStr.toLowerCase();
      if (
        lowerContent.includes("step by step") ||
        lowerContent.includes("think deeply") ||
        lowerContent.includes("solve this logic puzzle") ||
        lowerContent.includes("reason through")
      ) {
        hasReasoningKeywords = true;
      }
    }
  }

  if (hasReasoningKeywords || hasMathOrLogic) {
    return "reasoning";
  }

  if (codeBlocksCount > 0 || totalLength > 8000) {
    return "complex";
  }

  if (totalLength < 150 && !lastUserContent.includes("\n")) {
    return "simple";
  }

  return "standard";
}

export function sortTargetsByComplexityTier(targets: any[], tier: ComplexityTier): any[] {
  // We prioritize models based on tier.
  // Standard models
  const isSimple = (m: string) => /flash|haiku|mini|8b|1\.5-pro-nano|lite/i.test(m);
  const isReasoning = (m: string) => /o1|o3|thinking|reasoning/i.test(m);
  const isComplex = (m: string) => /opus|gpt-4o|claude-3-5-sonnet|gemini-1\.5-pro|gemini-2\.5-pro/i.test(m) && !isSimple(m);

  return [...targets].sort((a, b) => {
    const m1 = a.modelStr || "";
    const m2 = b.modelStr || "";
    
    let score1 = 0;
    let score2 = 0;

    if (tier === "simple") {
      score1 = isSimple(m1) ? 10 : isComplex(m1) ? -10 : 0;
      score2 = isSimple(m2) ? 10 : isComplex(m2) ? -10 : 0;
    } else if (tier === "reasoning") {
      score1 = isReasoning(m1) ? 20 : isComplex(m1) ? 10 : -10;
      score2 = isReasoning(m2) ? 20 : isComplex(m2) ? 10 : -10;
    } else if (tier === "complex") {
      score1 = isComplex(m1) ? 10 : isSimple(m1) ? -10 : 0;
      score2 = isComplex(m2) ? 10 : isSimple(m2) ? -10 : 0;
    } else {
      // standard
      score1 = (!isSimple(m1) && !isReasoning(m1) && !isComplex(m1)) ? 10 : isComplex(m1) ? 5 : 0;
      score2 = (!isSimple(m2) && !isReasoning(m2) && !isComplex(m2)) ? 10 : isComplex(m2) ? 5 : 0;
    }

    return score2 - score1; // Descending
  });
}
