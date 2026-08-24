import { deleteImage, readImage } from "@/lib/upload-store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const image = await readImage(id);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.buffer, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=3600",
      "Content-Length": String(image.buffer.length),
    },
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await deleteImage(id);
  return new Response(null, { status: 204 });
}
