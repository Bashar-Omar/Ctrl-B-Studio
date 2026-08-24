import type { CreativeState, UploadedAsset } from "./types";

const clean = (value: string) => value.trim().replace(/\s+/g, " ");

function referenceLine(assets: UploadedAsset[]) {
  const active = assets.filter((a) => a.role === "reference" || a.role === "detail");
  if (!active.length) return "";

  const mapped = active.map((a, i) => {
    const bits = [`Image ${i + 1}`];
    if (a.variant) bits.push(`colorway=${clean(a.variant)}`);
    if (a.note) bits.push(clean(a.note));
    if (a.role === "detail") bits.push("detail view");
    return bits.join(": ");
  });

  return `Reference map: ${mapped.join("; ")}. Use these images for product identity and detail guidance.`;
}

function variantRule(c: CreativeState) {
  if (c.variantMode !== "multi_color") return "";

  const base = "All uploaded color references depict the SAME SKU/product. Lock geometry, proportions, construction, material layout, logo placement and design details; colorway is the only intentional SKU difference.";
  if (c.variantStrategy === "target_only") {
    return `${base} Target colorway: ${clean(c.targetVariant) || "the colorway explicitly requested in the prompt"}. Other colorways are identity references only; do not blend, average or accidentally show their colors.`;
  }
  if (c.variantStrategy === "lineup") {
    return `${base} Show requested colorways as separate, clearly distinct physical products. Never merge two colorways on one item and never alter geometry between colors.`;
  }
  return `${base} A color transition is allowed only when explicitly staged; during the transition keep the exact same product geometry and change only the intended colorway.`;
}

export function buildPrompt(c: CreativeState, assets: UploadedAsset[]) {
  const lines = [
    c.preset !== "Custom" ? `Production: ${c.preset}.` : "",
    c.category ? `Category: ${c.category}.` : "",
    c.productDescription ? `Product: ${clean(c.productDescription)}.` : "",
    variantRule(c),
    referenceLine(assets),
    c.campaignGoal ? `Objective: ${clean(c.campaignGoal)}.` : "",
    c.environment ? `Set: ${clean(c.environment)}.` : "",
    c.lighting ? `Lighting: ${clean(c.lighting)}.` : "",
    c.tone ? `Style: ${clean(c.tone)}.` : "",
    c.palette ? `Palette: ${clean(c.palette)}.` : "",
    c.camera ? `Camera: ${clean(c.camera)}.` : "",
    c.motion ? `Motion: ${clean(c.motion)}.` : "",
    c.talent && c.talent !== "None" ? `Talent: ${clean(c.talent)}; natural product handling; branding remains visible; hands and product geometry stay anatomically/physically correct.` : "",
    c.script ? `Dialogue (${c.language || "requested language"}${c.dialect ? `; ${clean(c.dialect)}` : ""}; ${c.delivery || "natural"}): “${clean(c.script)}”` : "",
    c.brandConstraints ? `Brand lock: ${clean(c.brandConstraints)}.` : "",
    "Fidelity: preserve the exact product identity, proportions, materials, colors, labels, logo placement and package geometry from the chosen references; never invent brand text.",
    c.negative ? `Avoid: ${clean(c.negative)}.` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

const PRIORITY_PATTERNS: Array<[RegExp, number]> = [
  [/^(dialogue|brand lock|fidelity|reference map|product|motion|camera|talent|all uploaded color|target colorway)/i, 4],
  [/^(set|lighting|style|palette|avoid)/i, 3],
  [/^(objective|production|category)/i, 2],
];

function priority(line: string) {
  for (const [pattern, score] of PRIORITY_PATTERNS) if (pattern.test(line)) return score;
  return 1;
}

function trimToChars(value: string, max: number) {
  const chars = Array.from(value);
  if (chars.length <= max) return value;
  if (max <= 1) return chars.slice(0, max).join("");
  const raw = chars.slice(0, Math.max(1, max - 1)).join("");
  const wordSafe = raw.replace(/\s+\S*$/, "").trim();
  return `${wordSafe || raw.trim()}…`;
}

/**
 * Deterministic local compactor. It never calls another AI model and therefore
 * adds no text-model cost. It keeps load-bearing product/dialogue/reference
 * instructions first and sheds atmosphere/marketing prose before identity.
 */
export function fitPromptToChars(input: string, maxChars: number) {
  const normalized = input
    .split(/\n+/)
    .map((line) => clean(line))
    .filter(Boolean)
    .filter((line, index, all) => all.findIndex((other) => other.toLowerCase() === line.toLowerCase()) === index);

  const joined = normalized.join("\n");
  if (Array.from(joined).length <= maxChars) return joined;

  const indexed = normalized.map((line, index) => ({ line, index, score: priority(line) }));
  const mustKeep = indexed.filter((x) => x.score >= 4);
  const optional = indexed.filter((x) => x.score < 4).sort((a, b) => b.score - a.score || a.index - b.index);

  const selected = [...mustKeep];
  let used = selected.reduce((sum, x) => sum + Array.from(x.line).length + 1, 0);

  for (const item of optional) {
    const len = Array.from(item.line).length + 1;
    if (used + len <= maxChars) {
      selected.push(item);
      used += len;
    }
  }

  selected.sort((a, b) => a.index - b.index);
  let result = selected.map((x) => x.line).join("\n");
  if (Array.from(result).length <= maxChars) return result;

  // If the load-bearing lines alone are too long, shrink them proportionally
  // while preserving every section instead of chopping off the tail.
  const lines = selected.map((x) => x.line);
  const separatorBudget = Math.max(0, lines.length - 1);
  const contentBudget = Math.max(1, maxChars - separatorBudget);
  const total = lines.reduce((sum, line) => sum + Array.from(line).length, 0) || 1;
  const minimum = Math.min(90, Math.max(30, Math.floor(contentBudget / Math.max(1, lines.length))));
  const compacted = lines.map((line) => {
    const share = Math.max(minimum, Math.floor(contentBudget * (Array.from(line).length / total)));
    return trimToChars(line, share);
  });

  result = compacted.join("\n");
  return trimToChars(result, maxChars);
}
