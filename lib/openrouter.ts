import type { VideoJob, VideoModel } from "./types";

const BASE = "https://openrouter.ai/api/v1";

function appHeaders(json = true) {
  const key = process.env.OPENROUTER_API_KEY;
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (key) headers.Authorization = `Bearer ${key}`;
  if (process.env.APP_URL) headers["HTTP-Referer"] = process.env.APP_URL;
  headers["X-Title"] = process.env.OPENROUTER_APP_NAME || "CTRL-B Video Studio";
  return headers;
}

async function checked(response: Response) {
  if (!response.ok) {
    const body = await response.text();
    let message = body || `OpenRouter request failed (${response.status})`;
    try {
      const parsed = JSON.parse(body);
      const upstream = parsed?.error?.message || parsed?.message || parsed?.error || parsed;
      message = typeof upstream === "string" ? upstream : JSON.stringify(upstream);
    } catch { /* keep raw body */ }
    if (/prompt: size must be between 0 and 2500/i.test(message)) {
      message = "The selected Kling provider rejected the prompt because it exceeds 2,500 characters. Use ‘Fit to model’ in CTRL-B Video Studio and submit again.";
    }
    const err = new Error(message);
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }
  return response;
}

export async function listVideoModels(): Promise<VideoModel[]> {
  const response = await fetch(`${BASE}/videos/models`, { cache: "no-store" });
  const data = await (await checked(response)).json();
  return Array.isArray(data?.data) ? data.data : [];
}

export async function submitVideo(payload: Record<string, unknown>): Promise<VideoJob> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  const response = await fetch(`${BASE}/videos`, {
    method: "POST",
    headers: appHeaders(true),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return (await (await checked(response)).json()) as VideoJob;
}

export async function getVideoJob(jobId: string): Promise<VideoJob> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  const response = await fetch(`${BASE}/videos/${encodeURIComponent(jobId)}`, {
    headers: appHeaders(false), cache: "no-store",
  });
  return (await (await checked(response)).json()) as VideoJob;
}

export async function getVideoContent(jobId: string, index = 0) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  return checked(await fetch(`${BASE}/videos/${encodeURIComponent(jobId)}/content?index=${index}`, {
    headers: appHeaders(false), cache: "no-store",
  }));
}
