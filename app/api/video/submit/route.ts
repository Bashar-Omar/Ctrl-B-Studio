import { NextRequest, NextResponse } from "next/server";
import { submitVideo, listVideoModels } from "@/lib/openrouter";
import { MODEL_FALLBACKS, MODEL_ORDER } from "@/lib/model-fallbacks";
import type { VideoSubmitRequest } from "@/lib/types";
import { assertSameOrigin, rateLimit } from "@/lib/guard";
import { countPromptChars, getModelConstraint } from "@/lib/model-constraints";

function mediaUrl(origin: string, id: string) {
  const base = (process.env.APP_URL || origin).replace(/\/$/, "");
  return `${base}/api/media/${encodeURIComponent(id)}`;
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    rateLimit(request, "generation");
    const body = (await request.json()) as VideoSubmitRequest;
    if (!MODEL_ORDER.includes(body.model as (typeof MODEL_ORDER)[number])) return NextResponse.json({ error: "Model is not allowed in this studio." }, { status: 400 });
    if (!body.prompt?.trim()) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

    const studioConstraint = getModelConstraint(body.model);
    const promptChars = countPromptChars(body.prompt.trim());
    if (studioConstraint.promptMaxChars && studioConstraint.promptLimitConfidence === "hard" && promptChars > studioConstraint.promptMaxChars) {
      return NextResponse.json({
        error: `${MODEL_FALLBACKS[body.model]?.name || body.model} accepts at most ${studioConstraint.promptMaxChars} prompt characters. Current prompt: ${promptChars}. Use the studio “Fit to model” action before submitting.`,
        code: "PROMPT_TOO_LONG",
        promptChars,
        promptMaxChars: studioConstraint.promptMaxChars,
      }, { status: 400 });
    }

    let model = MODEL_FALLBACKS[body.model];
    try { model = (await listVideoModels()).find((m) => m.id === body.model) ?? model; } catch { /* fallback validation */ }
    if (!model.supported_durations?.includes(Number(body.duration))) return NextResponse.json({ error: "Selected duration is not supported by this model." }, { status: 400 });
    if (body.resolution && model.supported_resolutions?.length && !model.supported_resolutions.includes(body.resolution)) return NextResponse.json({ error: "Selected resolution is not supported by this model." }, { status: 400 });
    if (body.aspect_ratio && model.supported_aspect_ratios?.length && !model.supported_aspect_ratios.includes(body.aspect_ratio)) return NextResponse.json({ error: "Selected aspect ratio is not supported by this model." }, { status: 400 });

    const refIds = (body.referenceIds ?? []).slice(0, Math.max(1, Number(process.env.MAX_UPLOAD_FILES || 15)));
    if (studioConstraint.maxReferenceImages && studioConstraint.referenceLimitConfidence === "hard" && refIds.length > studioConstraint.maxReferenceImages) {
      return NextResponse.json({
        error: `${MODEL_FALLBACKS[body.model]?.name || body.model} accepts at most ${studioConstraint.maxReferenceImages} reference images. Current active references: ${refIds.length}. Mark extra uploads as “Not sent” or switch models.`,
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
      aspect_ratio: body.aspect_ratio || undefined,
      generate_audio: Boolean(body.generate_audio),
      frame_images: frame_images.length ? frame_images : undefined,
      input_references: input_references.length ? input_references : undefined,
    };
    if (Number.isInteger(body.seed)) payload.seed = body.seed;
    if (body.provider && Object.keys(body.provider).length) payload.provider = body.provider;

    const job = await submitVideo(payload);
    return NextResponse.json({ job, submitted: { model: body.model, duration: body.duration, resolution: body.resolution, aspect_ratio: body.aspect_ratio, generate_audio: body.generate_audio } });
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not submit video." }, { status: status && status >= 400 && status < 600 ? status : 500 });
  }
}
