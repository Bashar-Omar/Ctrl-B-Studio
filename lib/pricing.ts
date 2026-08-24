import type { VideoModel } from "./types";

function n(v: unknown): number | null {
  const value = typeof v === "number" ? v : Number(v);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function fallbackRate(model: VideoModel, resolution: string, audio: boolean): number | null {
  const skus = model.pricing_skus ?? {};
  const exact = [
    `fallback-${resolution}-second`,
    audio ? "fallback-audio-second" : "fallback-no-audio-second",
    "fallback-second",
  ];
  for (const key of exact) {
    const value = n(skus[key]);
    if (value !== null) return value;
  }
  return null;
}

export function estimateVideoCost(model: VideoModel | null, duration: number, resolution: string, audio: boolean) {
  if (!model || !duration) return null;
  const skus = model.pricing_skus ?? {};
  const entries = Object.entries(skus)
    .map(([key, raw]) => ({ key: key.toLowerCase(), value: n(raw) }))
    .filter((x): x is { key: string; value: number } => x.value !== null && !x.key.startsWith("fallback-"));

  const perSecond = entries.filter((x) => /second|sec/.test(x.key));
  if (perSecond.length) {
    const scored = perSecond.map((item) => {
      let score = 0;
      if (item.key.includes(resolution.toLowerCase())) score += 5;
      if (audio && /audio/.test(item.key) && !/no.?audio|without/.test(item.key)) score += 4;
      if (!audio && /no.?audio|without/.test(item.key)) score += 4;
      if (!audio && !/audio/.test(item.key)) score += 1;
      return { ...item, score };
    }).sort((a, b) => b.score - a.score || a.value - b.value);
    if (scored[0]) return scored[0].value * duration;
  }

  const generate = entries.find((x) => x.key === "generate");
  if (generate) return generate.value;

  const fallback = fallbackRate(model, resolution, audio);
  return fallback === null ? null : fallback * duration;
}

export const money = (value: number | null, currency: "USD" | "EGP" = "USD") => {
  if (value === null) return "—";
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-EG", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "USD" ? 2 : 1,
    maximumFractionDigits: currency === "USD" ? 3 : 1,
  }).format(value);
};
