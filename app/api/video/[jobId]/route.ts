import { NextResponse } from "next/server";
import { getVideoJob } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    if (!/^[A-Za-z0-9_-]+$/.test(jobId)) return NextResponse.json({ error: "Invalid job id." }, { status: 400 });
    return NextResponse.json(await getVideoJob(jobId));
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not poll job." }, { status: status && status >= 400 && status < 600 ? status : 500 });
  }
}
