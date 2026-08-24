import { NextResponse } from "next/server";
import { listVideoModels } from "@/lib/openrouter";
import { MODEL_FALLBACKS } from "@/lib/model-fallbacks";
import { FEATURED_MODEL_IDS, companyLabel, companyRank, normalizeVideoModel } from "@/lib/model-catalog";
import type { VideoModel } from "@/lib/types";

export const dynamic = "force-dynamic";

function mergeModel(remote: VideoModel, fallback?: VideoModel): VideoModel {
  return normalizeVideoModel({
    ...(fallback ?? {}),
    ...remote,
    id: remote.id,
    name: remote.name || fallback?.name || remote.id,
    supported_durations: remote.supported_durations?.length ? remote.supported_durations : fallback?.supported_durations ?? [],
    supported_resolutions: remote.supported_resolutions?.length ? remote.supported_resolutions : fallback?.supported_resolutions ?? [],
    supported_aspect_ratios: remote.supported_aspect_ratios?.length ? remote.supported_aspect_ratios : fallback?.supported_aspect_ratios ?? [],
    supported_frame_images: remote.supported_frame_images?.length ? remote.supported_frame_images : fallback?.supported_frame_images ?? [],
    supported_sizes: remote.supported_sizes?.length ? remote.supported_sizes : fallback?.supported_sizes ?? [],
    generate_audio: remote.generate_audio ?? fallback?.generate_audio ?? false,
    pricing_skus: { ...(fallback?.pricing_skus ?? {}), ...(remote.pricing_skus ?? {}) },
    allowed_passthrough_parameters: remote.allowed_passthrough_parameters ?? fallback?.allowed_passthrough_parameters ?? [],
    workflow: fallback?.workflow ?? remote.workflow ?? "generate",
    fallback: false,
  } as VideoModel);
}

function sortCatalog(models: VideoModel[]) {
  return [...models].sort((a, b) => {
    const ca = companyLabel(a);
    const cb = companyLabel(b);
    return companyRank(ca) - companyRank(cb) || ca.localeCompare(cb) || a.name.localeCompare(b.name);
  });
}

export async function GET() {
  try {
    const live = await listVideoModels();
    const liveIds = new Set(live.map((m) => m.id));
    const models = live.map((remote) => mergeModel(remote, MODEL_FALLBACKS[remote.id]));

    // Keep important/featured models visible even during temporary upstream catalog gaps.
    for (const id of FEATURED_MODEL_IDS) {
      if (!liveIds.has(id) && MODEL_FALLBACKS[id]) models.push(normalizeVideoModel({ ...MODEL_FALLBACKS[id], fallback: true }));
    }

    const unique = [...new Map(models.map((m) => [m.id, m])).values()];
    return NextResponse.json({
      models: sortCatalog(unique),
      featuredIds: FEATURED_MODEL_IDS,
      source: "openrouter-live",
      liveCount: live.length,
      totalCount: unique.length,
    });
  } catch (error) {
    const models = sortCatalog(Object.values(MODEL_FALLBACKS).map((m) => normalizeVideoModel({ ...m, fallback: true })));
    return NextResponse.json({
      models,
      featuredIds: FEATURED_MODEL_IDS,
      source: "fallback",
      liveCount: 0,
      totalCount: models.length,
      warning: error instanceof Error ? error.message : "Could not refresh OpenRouter model metadata.",
    });
  }
}
