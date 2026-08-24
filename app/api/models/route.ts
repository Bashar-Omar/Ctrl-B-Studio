import { NextResponse } from "next/server";
import { listVideoModels } from "@/lib/openrouter";
import { MODEL_FALLBACKS, MODEL_ORDER } from "@/lib/model-fallbacks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const live = await listVideoModels();
    const liveMap = new Map(live.map((m) => [m.id, m]));
    const models = MODEL_ORDER.map((id) => {
      const fallback = MODEL_FALLBACKS[id];
      const remote = liveMap.get(id);
      return remote ? {
        ...fallback,
        ...remote,
        supported_durations: remote.supported_durations?.length ? remote.supported_durations : fallback.supported_durations,
        supported_resolutions: remote.supported_resolutions?.length ? remote.supported_resolutions : fallback.supported_resolutions,
        supported_aspect_ratios: remote.supported_aspect_ratios?.length ? remote.supported_aspect_ratios : fallback.supported_aspect_ratios,
        supported_frame_images: remote.supported_frame_images?.length ? remote.supported_frame_images : fallback.supported_frame_images,
        pricing_skus: { ...fallback.pricing_skus, ...(remote.pricing_skus ?? {}) },
        fallback: false,
      } : fallback;
    });
    return NextResponse.json({ models, source: "openrouter-live" });
  } catch (error) {
    return NextResponse.json({
      models: MODEL_ORDER.map((id) => MODEL_FALLBACKS[id]),
      source: "fallback",
      warning: error instanceof Error ? error.message : "Could not refresh OpenRouter model metadata.",
    });
  }
}
