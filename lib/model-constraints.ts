export type LimitConfidence = "hard" | "recommended" | "unknown";

export type ModelConstraint = {
  promptMaxChars?: number;
  promptLimitConfidence: LimitConfidence;
  maxReferenceImages?: number;
  referenceLimitConfidence?: LimitConfidence;
  note?: string;
};

const UNKNOWN: ModelConstraint = { promptLimitConfidence: "unknown" };

/**
 * Provider constraints that are NOT currently exposed by OpenRouter's
 * /api/v1/videos/models response. Keep this intentionally small and only add
 * limits we have a defensible source for. OpenRouter capabilities remain the
 * source of truth for duration/resolution/aspect/frame controls.
 */
export const MODEL_CONSTRAINTS: Record<string, ModelConstraint> = {
  "kwaivgi/kling-v3.0-pro": {
    promptMaxChars: 2500,
    promptLimitConfidence: "hard",
    note: "Kling 3.0 providers enforce a 2,500-character prompt ceiling.",
  },
  "kwaivgi/kling-v3.0-std": {
    promptMaxChars: 2500,
    promptLimitConfidence: "hard",
    note: "Kling 3.0 providers enforce a 2,500-character prompt ceiling.",
  },
  "kwaivgi/kling-video-o1": {
    promptMaxChars: 2500,
    promptLimitConfidence: "hard",
    maxReferenceImages: 6,
    referenceLimitConfidence: "hard",
    note: "Kling Video O1 accepts up to 6 reference images and a 2,500-character prompt.",
  },
  "bytedance/seedance-2.0-mini": {
    promptMaxChars: 2000,
    promptLimitConfidence: "recommended",
    maxReferenceImages: 9,
    referenceLimitConfidence: "recommended",
    note: "Seedance 2.0 Mini commonly exposes a 2,000-character prompt and up to 9 image references; OpenRouter may route differently.",
  },
  "bytedance/seedance-2.0": {
    promptMaxChars: 2000,
    promptLimitConfidence: "recommended",
    maxReferenceImages: 9,
    referenceLimitConfidence: "recommended",
    note: "Seedance 2.0 commonly exposes a 2,000-character prompt and up to 9 image references; OpenRouter may route differently.",
  },
  "bytedance/seedance-2.5": {
    promptMaxChars: 2000,
    promptLimitConfidence: "recommended",
    maxReferenceImages: 15,
    referenceLimitConfidence: "recommended",
    note: "Seedance 2.5 supports very large reference sets; the studio keeps uploads at 15. Prompt ceilings vary by serving provider, so 2,000 is treated as a safe recommendation rather than a hard block.",
  },
};

export function getModelConstraint(modelId?: string | null): ModelConstraint {
  return modelId ? MODEL_CONSTRAINTS[modelId] ?? UNKNOWN : UNKNOWN;
}

export function countPromptChars(value: string) {
  return Array.from(value).length;
}

export function safePromptTarget(limit: number) {
  // Keep a small buffer for providers whose validators count Unicode slightly differently.
  return Math.max(1, Math.floor(limit * 0.94));
}
