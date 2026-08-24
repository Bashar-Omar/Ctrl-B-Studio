import { NextRequest, NextResponse } from "next/server";
import { saveImage } from "@/lib/upload-store";
import { assertSameOrigin, rateLimit } from "@/lib/guard";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    rateLimit(request, "upload", Number(process.env.MAX_UPLOADS_PER_HOUR || 60));
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing image file." }, { status: 400 });
    const saved = await saveImage(file);
    return NextResponse.json({ ...saved, url: `/api/media/${saved.id}` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
