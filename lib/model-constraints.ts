import type { StudioWorkflow } from "./types";

export type LimitConfidence = "hard" | "recommended" | "unknown";

export type ModelConstraint = {
  promptMaxChars?: number;
  promptLimitConfidence: LimitConfidence;
  maxReferenceImages?: number;
  referenceLimitConfidence?: LimitConfidence;
  workflow?: StudioWorkflow;
  requiresSourceVideo?: boolean;
  note?: string;
};

const UNKNOWN: ModelConstraint = { promptLimitConfidence: "unknown", referenceLimitConfidence: "unknown", workflow: "generate" };

/**
 * Limits that OpenRouter's /api/v1/videos/models does not currently publish.
 * Hard limits are only used when the upstream/provider contract is clear.
 * Recommended limits are advisory because OpenRouter routing or provider
 * implementations can differ. Duration/resolution/aspect/frame support always
 * comes from OpenRouter live metadata first.
 */
export const MODEL_CONSTRAINTS: Record<string, ModelConstraint> = {
  "kwaivgi/kling-v3.0-pro": {
    promptMaxChars: 2500,
    promptLimitConfidence: "hard",
    referenceLimitConfidence: "unknown",
    note: "Kling 3.0 providers enforce a 2,500-character prompt ceiling. Multi-reference image count is not published by OpenRouter.",
  },
  "kwaivgi/kling-v3.0-std": {
    promptMaxChars: 2500,
    promptLimitConfidence: "hard",
    referenceLimitConfidence: "unknown",
    note: "Kling 3.0 providers enforce a 2,500-character prompt ceiling. Multi-reference image count is not published by OpenRouter.",
  },
  "kwaivgi/kling-video-o1": {
    promptMaxChars: 2500,
    promptLimitConfidence: "hard",
    maxReferenceImages: 6,
    referenceLimitConfidence: "hard",
    note: "Kling Video O1 accepts up to 6 reference images in its reference workflow and a 2,500-character prompt.",
  },
  "bytedance/seedance-1-5-pro": {
    promptMaxChars: 2000,
    promptLimitConfidence: "recommended",
    maxReferenceImages: 2,
    referenceLimitConfidence: "recommended",
    note: "Seedance 1.5 Pro upstream schemas commonly expose 2,000–2,500 prompt characters and up to two frame images. OpenRouter does not publish a universal hard text/reference cap.",
  },
  "bytedance/seedance-2.0-mini": {
    promptMaxChars: 2000,
    promptLimitConfidence: "recommended",
    maxReferenceImages: 9,
    referenceLimitConfidence: "recommended",
    note: "Seedance 2.0 Mini commonly exposes a 2,000-character prompt and up to 9 image references; OpenRouter routing may differ.",
  },
  "bytedance/seedance-2.0-fast": {
    promptMaxChars: 2000,
    promptLimitConfidence: "recommended",
    maxReferenceImages: 9,
    referenceLimitConfidence: "recommended",
    note: "Seedance 2.0 Fast commonly exposes up to 9 image references. Prompt ceilings vary across serving integrations, so 2,000 is treated as a safe recommendation.",
  },
  "bytedance/seedance-2.0": {
    promptMaxChars: 2000,
    promptLimitConfidence: "recommended",
    maxReferenceImages: 9,
    referenceLimitConfidence: "recommended",
    note: "Seedance 2.0 commonly exposes up to 9 image references. OpenRouter does not publish a universal hard prompt cap, so 2,000 is advisory.",
  },
  "bytedance/seedance-2.5": {
    promptMaxChars: 2000,
    promptLimitConfidence: "recommended",
    maxReferenceImages: 30,
    referenceLimitConfidence: "recommended",
    note: "Seedance 2.5 supports large multimodal reference sets (up to 50 total assets in OpenRouter's model description). The studio uses 2,000 chars as a conservative prompt recommendation, not a hard OpenRouter limit.",
  },
  "runway/gen-4.5": {
    promptMaxChars: 1000,
    promptLimitConfidence: "hard",
    maxReferenceImages: 1,
    referenceLimitConfidence: "recommended",
    note: "Runway's direct Gen-4.5 API limits promptText to 1,000 UTF-16 code units and uses one source image for image-to-video. OpenRouter may abstract the image field differently.",
  },
  "runway/aleph-2": {
    promptMaxChars: 1000,
    promptLimitConfidence: "hard",
    maxReferenceImages: 5,
    referenceLimitConfidence: "hard",
    workflow: "video_edit",
    requiresSourceVideo: true,
    note: "Aleph 2.0 is a video-edit model: it requires a 2–30s source video and supports up to 5 keyframe images. CTRL-B V1.2 lists its metadata but intentionally blocks generation until source-video upload is added.",
  },
  "google/veo-3.1": {
    promptLimitConfidence: "unknown",
    referenceLimitConfidence: "unknown",
    note: "OpenRouter publishes Veo duration/resolution/aspect/frame capabilities live, but does not publish a universal prompt-character or multi-reference-image ceiling.",
  },
  "google/veo-3.1-lite": {
    promptLimitConfidence: "unknown",
    referenceLimitConfidence: "unknown",
    note: "OpenRouter publishes Veo Lite frame support and output controls live. Prompt and multi-reference count limits are not exposed in video model metadata.",
  },
  "google/veo-3.1-fast": {
    promptLimitConfidence: "unknown",
    referenceLimitConfidence: "unknown",
    note: "OpenRouter publishes Veo Fast output/frame capabilities live. Prompt and multi-reference count limits are not exposed in video model metadata.",
  },
  "openai/sora-2-pro": {
    promptLimitConfidence: "unknown",
    referenceLimitConfidence: "unknown",
    note: "OpenRouter publishes Sora 2 Pro output capabilities but not a hard prompt/reference count. OpenRouter currently says this model is scheduled for removal on September 24, 2026.",
  },
};

export function getModelConstraint(modelId?: string | null): ModelConstraint {
  return modelId ? MODEL_CONSTRAINTS[modelId] ?? UNKNOWN : UNKNOWN;
}

export function countPromptChars(value: string) {
  return Array.from(value).length;
}

export function safePromptTarget(limit: number) {
  return Math.max(1, Math.floor(limit * 0.94));
}
