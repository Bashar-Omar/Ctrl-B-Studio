import "server-only";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.join(process.cwd(), ".data", "uploads");
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function ensureUploadDir() { await mkdir(ROOT, { recursive: true }); }

export async function cleanupUploads() {
  await ensureUploadDir();
  const ttl = Math.max(1, Number(process.env.UPLOAD_TTL_HOURS || 24)) * 3600_000;
  const now = Date.now();
  for (const file of await readdir(ROOT)) {
    const full = path.join(ROOT, file);
    try { if (now - (await stat(full)).mtimeMs > ttl) await unlink(full); } catch { /* lazy cleanup */ }
  }
}

export async function saveImage(file: File) {
  const ext = MIME_EXT[file.type];
  if (!ext) throw new Error("Only JPG, PNG and WEBP images are supported.");
  const maxMb = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 10));
  if (file.size > maxMb * 1024 * 1024) throw new Error(`Image is larger than ${maxMb} MB.`);
  await cleanupUploads();
  const id = `${crypto.randomUUID()}.${ext}`;
  await writeFile(path.join(ROOT, id), Buffer.from(await file.arrayBuffer()));
  return { id, type: file.type, size: file.size, name: file.name };
}

export async function readImage(id: string) {
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(id)) return null;
  await ensureUploadDir();
  const full = path.join(ROOT, id);
  try {
    const buffer = await readFile(full);
    const ext = path.extname(id).slice(1).toLowerCase();
    const type = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return { buffer, type };
  } catch { return null; }
}

export async function deleteImage(id: string) {
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(id)) return;
  try { await unlink(path.join(ROOT, id)); } catch { /* already gone */ }
}
