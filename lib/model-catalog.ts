import type { VideoModel } from "./types";

export const FEATURED_MODEL_IDS = [
  "google/veo-3.1",
  "google/veo-3.1-lite",
  "google/veo-3.1-fast",
  "openai/sora-2-pro",
  "bytedance/seedance-2.5",
  "bytedance/seedance-2.0",
  "bytedance/seedance-2.0-fast",
  "bytedance/seedance-2.0-mini",
  "bytedance/seedance-1-5-pro",
  "kwaivgi/kling-v3.0-pro",
  "kwaivgi/kling-v3.0-std",
  "kwaivgi/kling-video-o1",
  "runway/gen-4.5",
  "runway/aleph-2",
] as const;

const COMPANY_LABELS: Record<string, string> = {
  google: "Google",
  openai: "OpenAI",
  bytedance: "ByteDance",
  "bytedance-seed": "ByteDance",
  kwaivgi: "Kling",
  runway: "Runway",
  alibaba: "Alibaba",
  minimax: "MiniMax",
  "x-ai": "xAI",
  "black-forest-labs": "Black Forest Labs",
};

const COMPANY_ORDER = ["Google", "ByteDance", "Kling", "OpenAI", "Runway", "Alibaba", "MiniMax", "xAI", "Black Forest Labs"];

export function companyKey(modelOrId: Pick<VideoModel, "id"> | string) {
  const id = typeof modelOrId === "string" ? modelOrId : modelOrId.id;
  return id.split("/")[0] || "other";
}

export function companyLabel(modelOrId: Pick<VideoModel, "id"> | string) {
  const key = companyKey(modelOrId);
  return COMPANY_LABELS[key] || key.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
}

export function companyRank(label: string) {
  const index = COMPANY_ORDER.indexOf(label);
  return index === -1 ? 100 : index;
}

function resolutionWeight(value: string) {
  const normalized = value.trim().toLowerCase();
  const p = normalized.match(/(\d{3,4})p/);
  if (p) return Number(p[1]);
  const k = normalized.match(/([124])k/);
  if (k) return Number(k[1]) * 1000;
  const size = normalized.match(/(\d+)x(\d+)/);
  if (size) return Math.sqrt(Number(size[1]) * Number(size[2]));
  return 99999;
}

export function sortResolutions(values: string[] = []) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => resolutionWeight(a) - resolutionWeight(b) || a.localeCompare(b));
}

export function sortSizes(values: string[] = []) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => {
    const area = (v: string) => {
      const m = v.match(/(\d+)x(\d+)/i);
      return m ? Number(m[1]) * Number(m[2]) : Number.MAX_SAFE_INTEGER;
    };
    return area(a) - area(b) || a.localeCompare(b);
  });
}

export function normalizeVideoModel(model: VideoModel): VideoModel {
  return {
    ...model,
    supported_durations: [...new Set((model.supported_durations ?? []).map(Number).filter((v) => Number.isFinite(v) && v > 0))].sort((a, b) => a - b),
    supported_resolutions: sortResolutions(model.supported_resolutions ?? []),
    supported_aspect_ratios: [...new Set((model.supported_aspect_ratios ?? []).filter(Boolean))],
    supported_frame_images: [...new Set(model.supported_frame_images ?? [])],
    supported_sizes: sortSizes(model.supported_sizes ?? []),
    allowed_passthrough_parameters: [...new Set(model.allowed_passthrough_parameters ?? [])].sort(),
  };
}

export function isFeatured(modelId: string) {
  return (FEATURED_MODEL_IDS as readonly string[]).includes(modelId);
}

export function featuredRank(modelId: string) {
  const index = (FEATURED_MODEL_IDS as readonly string[]).indexOf(modelId);
  return index === -1 ? 999 : index;
}
