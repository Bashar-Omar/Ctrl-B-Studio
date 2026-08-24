import { NextRequest } from "next/server";
import { getVideoContent } from "@/lib/openrouter";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    if (!/^[A-Za-z0-9_-]+$/.test(jobId)) return new Response("Invalid job id", { status: 400 });
    const index = Math.max(0, Number(request.nextUrl.searchParams.get("index") || 0) || 0);
    const upstream = await getVideoContent(jobId, index);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "video/mp4",
        "Content-Disposition": `inline; filename=ctrl-b-${jobId}.mp4`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Could not download video.", { status: 500 });
  }
}
