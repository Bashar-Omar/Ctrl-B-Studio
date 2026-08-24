import type { VideoModel } from "./types";

const seconds = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => i + from);
const seedanceRatios = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
const klingRatios = ["16:9", "9:16", "1:1"];

export const MODEL_ORDER = [
  "bytedance/seedance-2.0-mini",
  "bytedance/seedance-2.5",
  "kwaivgi/kling-v3.0-pro",
  "kwaivgi/kling-v3.0-std",
  "kwaivgi/kling-video-o1",
  "bytedance/seedance-2.0",
] as const;

export const MODEL_FALLBACKS: Record<string, VideoModel> = {
  "bytedance/seedance-2.0-mini": {
    id: "bytedance/seedance-2.0-mini",
    name: "ByteDance: Seedance 2.0 Mini",
    description: "Fast, cost-efficient iteration with multimodal references and first/last-frame control.",
    supported_durations: seconds(4, 15),
    supported_resolutions: ["480p", "720p"],
    supported_aspect_ratios: seedanceRatios,
    supported_frame_images: ["first_frame", "last_frame"],
    generate_audio: true,
    pricing_skus: { "fallback-480p-second": 0.01345, "fallback-720p-second": 0.03024 },
    fallback: true,
  },
  "bytedance/seedance-2.5": {
    id: "bytedance/seedance-2.5",
    name: "ByteDance: Seedance 2.5",
    description: "Reference-heavy, multilingual audiovisual generation for complex product and UGC workflows.",
    supported_durations: seconds(4, 30),
    supported_resolutions: ["480p", "720p"],
    supported_aspect_ratios: [...seedanceRatios, "9:21"],
    supported_frame_images: ["first_frame", "last_frame"],
    generate_audio: true,
    pricing_skus: { "fallback-480p-second": 0.1028, "fallback-720p-second": 0.2311 },
    fallback: true,
  },
  "kwaivgi/kling-v3.0-pro": {
    id: "kwaivgi/kling-v3.0-pro",
    name: "Kling: Video v3.0 Pro",
    description: "Premium Kling tier for higher visual quality, image guidance and native audio.",
    supported_durations: seconds(3, 15),
    supported_resolutions: ["720p"],
    supported_aspect_ratios: klingRatios,
    supported_frame_images: ["first_frame", "last_frame"],
    generate_audio: true,
    pricing_skus: { "fallback-no-audio-second": 0.112, "fallback-audio-second": 0.168 },
    fallback: true,
  },
  "kwaivgi/kling-v3.0-std": {
    id: "kwaivgi/kling-v3.0-std",
    name: "Kling: Video v3.0 Standard",
    description: "Lower-cost Kling 3.0 tier for production iteration with first/last frames and native audio.",
    supported_durations: seconds(3, 15),
    supported_resolutions: ["720p"],
    supported_aspect_ratios: klingRatios,
    supported_frame_images: ["first_frame", "last_frame"],
    generate_audio: true,
    pricing_skus: { "fallback-no-audio-second": 0.084, "fallback-audio-second": 0.126 },
    fallback: true,
  },
  "kwaivgi/kling-video-o1": {
    id: "kwaivgi/kling-video-o1",
    name: "Kling: Video O1",
    description: "Cinematic short-form Kling model with 5/10 second clips and guided frame composition.",
    supported_durations: [5, 10],
    supported_resolutions: ["720p"],
    supported_aspect_ratios: klingRatios,
    supported_frame_images: ["first_frame", "last_frame"],
    generate_audio: false,
    pricing_skus: { "fallback-second": 0.112 },
    fallback: true,
  },
  "bytedance/seedance-2.0": {
    id: "bytedance/seedance-2.0",
    name: "ByteDance: Seedance 2.0",
    description: "Strong reference consistency, visual style preservation and camera movement control.",
    supported_durations: seconds(4, 15),
    supported_resolutions: ["480p", "720p"],
    supported_aspect_ratios: seedanceRatios,
    supported_frame_images: ["first_frame", "last_frame"],
    generate_audio: true,
    pricing_skus: { "fallback-480p-second": 0.06726, "fallback-720p-second": 0.1512 },
    fallback: true,
  },
};
