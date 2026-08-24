import { NextRequest, NextResponse } from "next/server";
import { submitVideo, listVideoModels } from "@/lib/openrouter";
import { MODEL_FALLBACKS } from "@/lib/model-fallbacks";
import { normalizeVideoModel } from "@/lib/model-catalog";
import type { VideoModel, VideoSubmitRequest } from "@/lib/types";
import { assertSameOrigin, rateLimit } from "@/lib/guard";
import { countPromptChars, getModelConstraint } from "@/lib/model-constraints";

function mediaUrl(origin: string, id: string) {
  const base = (process.env.APP_URL || origin).replace(/\/$/, "");
  return `${base}/api/media/${encodeURIComponent(id)}`;
}

async function resolveModel(modelId: string): Promise<VideoModel | null> {
  try {
    const live = await listVideoModels();
    const remote = live.find((m) => m.id === modelId);
    if (remote) {
      const fallback = MODEL_FALLBACKS[modelId];
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
        workflow: fallback?.workflow ?? remote.workflow ?? "generate",
      } as VideoModel);
    }
    // A successful live catalog lookup is authoritative: do not submit IDs OpenRouter is not listing.
    return null;
  } catch {
    // During a temporary catalog outage, curated featured fallbacks can still validate known models.
    return MODEL_FALLBACKS[modelId] ?? null;
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    rateLimit(request, "generation");
    const body = (await request.json()) as VideoSubmitRequest;
    if (!body.model?.trim()) return NextResponse.json({ error: "Model is required." }, { status: 400 });
    if (!body.prompt?.trim()) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

    const model = await resolveModel(body.model);
    if (!model) return NextResponse.json({ error: "This model is not currently listed by OpenRouter's video catalog." }, { status: 400 });

    const studioConstraint = getModelConstraint(body.model);
    if (studioConstraint.requiresSourceVideo || model.workflow === "video_edit") {
      return NextResponse.json({
        error: `${model.name} is a source-video editing model. CTRL-B currently lists its capabilities, but source-video upload/editing is not enabled yet. Choose a generation model for this workflow.`,
        code: "SOURCE_VIDEO_REQUIRED",
      }, { status: 400 });
    }

    const promptChars = countPromptChars(body.prompt.trim());
    if (studioConstraint.promptMaxChars && studioConstraint.promptLimitConfidence === "hard" && promptChars > studioConstraint.promptMaxChars) {
      return NextResponse.json({
        error: `${model.name} accepts at most ${studioConstraint.promptMaxChars} prompt characters. Current prompt: ${promptChars}. Use the studio “Fit to model” action before submitting.`,
        code: "PROMPT_TOO_LONG",
        promptChars,
        promptMaxChars: studioConstraint.promptMaxChars,
      }, { status: 400 });
    }

    if (model.supported_durations?.length && !model.supported_durations.includes(Number(body.duration))) {
      return NextResponse.json({ error: "Selected duration is not supported by this model." }, { status: 400 });
    }
    if (body.resolution && model.supported_resolutions?.length && !model.supported_resolutions.includes(body.resolution)) {
      return NextResponse.json({ error: "Selected resolution is not supported by this model." }, { status: 400 });
    }
    if (body.size && model.supported_sizes?.length && !model.supported_sizes.includes(body.size)) {
      return NextResponse.json({ error: "Selected output size is not supported by this model." }, { status: 400 });
    }
    if (body.aspect_ratio && model.supported_aspect_ratios?.length && !model.supported_aspect_ratios.includes(body.aspect_ratio)) {
      return NextResponse.json({ error: "Selected aspect ratio is not supported by this model." }, { status: 400 });
    }
    if (body.generate_audio && !model.generate_audio) {
      return NextResponse.json({ error: "Native audio is not advertised by this model." }, { status: 400 });
    }
    if (body.firstFrameId && model.supported_frame_images?.length && !model.supported_frame_images.includes("first_frame")) {
      return NextResponse.json({ error: "This model does not advertise first-frame control." }, { status: 400 });
    }
    if (body.lastFrameId && model.supported_frame_images?.length && !model.supported_frame_images.includes("last_frame")) {
      return NextResponse.json({ error: "This model does not advertise last-frame control." }, { status: 400 });
    }

    const refIds = (body.referenceIds ?? []).slice(0, Math.max(1, Number(process.env.MAX_UPLOAD_FILES || 15)));
    if (studioConstraint.maxReferenceImages !== undefined && studioConstraint.referenceLimitConfidence === "hard" && refIds.length > studioConstraint.maxReferenceImages) {
      return NextResponse.json({
        error: `${model.name} accepts at most ${studioConstraint.maxReferenceImages} reference images. Current active references: ${refIds.length}. Mark extra uploads as “Not sent” or switch models.`,
        code: "TOO_MANY_REFERENCES",
      }, { status: 400 });
    }

    const hasMedia = Boolean(body.firstFrameId || body.lastFrameId || refIds.length);
    const origin = request.nextUrl.origin;
    const publicBase = process.env.APP_URL || origin;
    if (hasMedia && !/^https:\/\//i.test(publicBase)) {
      return NextResponse.json({ error: "Uploaded image references require APP_URL to be a public HTTPS address (for example https://studio.ctrl-b.co). Text-to-video can still be tested locally." }, { status: 400 });
    }

    const frame_images = [] as Array<Record<string, unknown>>;
    if (body.firstFrameId) frame_images.push({ type: "image_url", image_url: { url: mediaUrl(origin, body.firstFrameId) }, frame_type: "first_frame" });
    if (body.lastFrameId) frame_images.push({ type: "image_url", image_url: { url: mediaUrl(origin, body.lastFrameId) }, frame_type: "last_frame" });
    const input_references = refIds.map((id) => ({ type: "image_url", image_url: { url: mediaUrl(origin, id) } }));

    const payload: Record<string, unknown> = {
      model: body.model,
      prompt: body.prompt.trim(),
      duration: Number(body.duration),
      resolution: body.resolution || undefined,
      size: body.size || undefined,
      aspect_ratio: body.size ? undefined : body.aspect_ratio || undefined,
      generate_audio: Boolean(body.generate_audio),
      frame_images: frame_images.length ? frame_images : undefined,
      input_references: input_references.length ? input_references : undefined,
    };
    if (Number.isInteger(body.seed)) payload.seed = body.seed;
    if (body.provider && Object.keys(body.provider).length) payload.provider = body.provider;

    const job = await submitVideo(payload);
    return NextResponse.json({
      job,
      submitted: {
        model: body.model,
        duration: body.duration,
        resolution: body.resolution,
        size: body.size,
        aspect_ratio: body.aspect_ratio,
        generate_audio: body.generate_audio,
      },
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not submit video." }, { status: status && status >= 400 && status < 600 ? status : 500 });
  }
}
