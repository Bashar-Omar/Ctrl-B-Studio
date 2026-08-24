import type { CreativeState, UploadedAsset } from "./types";

const clean = (value: string) => value.trim();

export function buildPrompt(c: CreativeState, assets: UploadedAsset[]) {
  const references = assets.filter((a) => a.role === "reference" || a.role === "detail");
  const referenceNotes = references
    .map((a, i) => `Reference ${i + 1}${a.note ? ` (${a.note})` : ""}: preserve the exact product identity, proportions, materials, colors, labels and logo placement visible in this image.`)
    .join("\n");

  const lines = [
    c.preset !== "Custom" ? `Production type: ${c.preset}.` : "",
    c.category ? `Product category: ${c.category}.` : "",
    c.productDescription ? `Product: ${clean(c.productDescription)}.` : "",
    c.campaignGoal ? `Campaign objective: ${clean(c.campaignGoal)}.` : "",
    referenceNotes,
    c.environment ? `Environment / set: ${clean(c.environment)}.` : "",
    c.lighting ? `Lighting: ${clean(c.lighting)}.` : "",
    c.tone ? `Visual tone: ${clean(c.tone)}.` : "",
    c.palette ? `Color palette: ${clean(c.palette)}.` : "",
    c.camera ? `Camera / framing: ${clean(c.camera)}.` : "",
    c.motion ? `Motion: ${clean(c.motion)}.` : "",
    c.talent && c.talent !== "None" ? `On-camera talent: ${clean(c.talent)}. The talent must handle the product naturally without hiding its branding or deforming it.` : "",
    c.script ? `Dialogue: Speak exactly and naturally in ${c.language || "the requested language"}${c.dialect ? ` (${c.dialect})` : ""}. Delivery: ${c.delivery || "natural"}. Script: “${clean(c.script)}”` : "",
    c.brandConstraints ? `Brand constraints: ${clean(c.brandConstraints)}.` : "",
    `Product fidelity is a top priority. Do not redesign the product, invent text, alter package geometry, move logos, or change brand colors unless explicitly requested.`,
    c.negative ? `Avoid: ${clean(c.negative)}.` : "",
  ].filter(Boolean);

  return lines.join("\n");
}
