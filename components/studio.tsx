"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AssetRole, CreativeState, UploadedAsset, VideoJob, VideoModel } from "@/lib/types";
import { buildPrompt, fitPromptToChars } from "@/lib/prompt-builder";
import { countPromptChars, getModelConstraint, safePromptTarget } from "@/lib/model-constraints";
import { estimateVideoCost, money } from "@/lib/pricing";
import { companyLabel, companyRank, featuredRank, isFeatured } from "@/lib/model-catalog";

const PRESETS = ["Product Hero Ad", "UGC Talking Ad", "Beauty / Cosmetics Demo", "Perfume Cinematic", "Footwear Showcase", "Custom"];
const CATEGORIES = ["Perfume", "Cosmetics", "Makeup", "Skincare", "Footwear", "Fashion", "Other"];
const INITIAL: CreativeState = {
  preset: "Product Hero Ad", category: "Perfume", campaignGoal: "Premium social ad that makes the product desirable and clearly recognizable",
  productDescription: "", environment: "Premium editorial studio set", lighting: "Soft key light with clean rim highlights", tone: "Photorealistic, premium, modern advertising",
  camera: "Slow controlled push-in with macro product close-ups", motion: "Natural, physically plausible motion; smooth and elegant", palette: "Brand-faithful neutral palette",
  talent: "None", language: "English", dialect: "", delivery: "Natural, confident and conversational", script: "", negative: "warped packaging, altered logo, unreadable labels, extra products, flicker, jitter, deformed hands, plastic skin, overdone VFX",
  brandConstraints: "Keep the product design, logo, label placement, materials and colors faithful to the uploaded references",
  variantMode: "single", variantStrategy: "target_only", targetVariant: "",
};

function Field({ label, value, onChange, placeholder, rows = 1 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <label className="field"><span>{label}</span>{rows > 1 ? <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /> : <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}</label>;
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
}
function PillGroup({ label, values, selected, onChange }: { label: string; values: Array<string | number>; selected: string | number; onChange: (v: string) => void }) {
  if (!values.length) return null;
  return <div className="field"><span>{label}</span><div className="pills">{values.map((v) => <button type="button" className={String(selected) === String(v) ? "pill active" : "pill"} key={v} onClick={() => onChange(String(v))}>{v}</button>)}</div></div>;
}

function compactModelMeta(model: VideoModel) {
  const durations = model.supported_durations ?? [];
  const quality = model.supported_resolutions?.length ? model.supported_resolutions.join("/") : model.supported_sizes?.length ? model.supported_sizes.join("/") : "dynamic";
  const d = durations.length ? (durations.length === 1 ? `${durations[0]}s` : `${durations[0]}–${durations.at(-1)}s`) : "duration varies";
  return `${d} · ${quality}`;
}

function ModelPicker({ models, value, onChange }: { models: VideoModel[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = models.find((m) => m.id === value);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q ? models : models.filter((m) => `${m.name} ${m.id} ${companyLabel(m)}`.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      if (q) {
        const score = (m: VideoModel) => {
          const name = m.name.toLowerCase();
          const slug = m.id.split("/").at(-1)?.toLowerCase() ?? "";
          const company = companyLabel(m).toLowerCase();
          return (name.startsWith(q) ? 0 : slug.startsWith(q) ? 1 : company.startsWith(q) ? 2 : name.includes(q) ? 3 : slug.includes(q) ? 4 : 5);
        };
        return score(a) - score(b) || companyRank(companyLabel(a)) - companyRank(companyLabel(b)) || a.name.localeCompare(b.name);
      }
      return companyRank(companyLabel(a)) - companyRank(companyLabel(b)) || companyLabel(a).localeCompare(companyLabel(b)) || Number(!isFeatured(a.id)) - Number(!isFeatured(b.id)) || featuredRank(a.id) - featuredRank(b.id) || a.name.localeCompare(b.name);
    });
  }, [models, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, VideoModel[]>();
    for (const m of filtered) {
      const label = companyLabel(m);
      map.set(label, [...(map.get(label) ?? []), m]);
    }
    return [...map.entries()].sort((a, b) => companyRank(a[0]) - companyRank(b[0]) || a[0].localeCompare(b[0]));
  }, [filtered]);

  const choose = (id: string) => { onChange(id); setOpen(false); setQuery(""); };

  return <div className="field model-picker-field" ref={wrapRef}>
    <span>Video model</span>
    <button type="button" className={open ? "model-picker-trigger open" : "model-picker-trigger"} onClick={() => setOpen((v) => !v)}>
      <div><strong>{selected?.name ?? "Choose a video model"}</strong><small>{selected ? `${companyLabel(selected)} · ${selected.id}` : "OpenRouter video catalog"}</small></div><b>⌄</b>
    </button>
    {open && <div className="model-picker-popover">
      <div className="model-search"><span>⌕</span><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Seedance, Veo, Sora, Kling…"/></div>
      <div className="model-picker-scroll">
        {grouped.map(([company, items]) => {
          const visibleItems = [...items].sort((a, b) => Number(!isFeatured(a.id)) - Number(!isFeatured(b.id)) || featuredRank(a.id) - featuredRank(b.id) || a.name.localeCompare(b.name));
          if (!visibleItems.length) return null;
          return <div className="model-group" key={company}><div className="model-group-title"><span>{company}</span><small>{visibleItems.length}</small></div>{visibleItems.map((m) => <button type="button" className={m.id === value ? "model-option active" : "model-option"} key={m.id} onClick={() => choose(m.id)}><div><strong>{m.name}{isFeatured(m.id) && <i className="featured-mark">FEATURED</i>}</strong><small>{m.id}</small></div><span>{compactModelMeta(m)}</span></button>)}</div>;
        })}
        {!filtered.length && <div className="model-empty">No video models match “{query}”.</div>}
      </div>
    </div>}
  </div>;
}

function LimitValue({ value, confidence }: { value?: number; confidence?: "hard" | "recommended" | "unknown" }) {
  if (value === undefined || confidence === "unknown") return <><strong>Not published</strong><small>by OpenRouter</small></>;
  return <><strong>{value.toLocaleString()}</strong><small>{confidence === "hard" ? "hard limit" : "safe recommendation"}</small></>;
}

export function Studio({ egpRate }: { egpRate: number }) {
  const [models, setModels] = useState<VideoModel[]>([]);
  const [modelCount, setModelCount] = useState(0);
  const [fxRate, setFxRate] = useState(egpRate);
  const [modelId, setModelId] = useState("bytedance/seedance-2.5");
  const [metaSource, setMetaSource] = useState("loading");
  const [creative, setCreative] = useState<CreativeState>(INITIAL);
  const [prompt, setPrompt] = useState("");
  const [promptEdited, setPromptEdited] = useState(false);
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("720p");
  const [outputSize, setOutputSize] = useState("");
  const [aspect, setAspect] = useState("9:16");
  const [audio, setAudio] = useState(false);
  const [seedEnabled, setSeedEnabled] = useState(false);
  const [seed, setSeed] = useState(42);
  const [expertOpen, setExpertOpen] = useState(false);
  const [providerJson, setProviderJson] = useState("");
  const [job, setJob] = useState<VideoJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const model = useMemo(() => models.find((m) => m.id === modelId) ?? null, [models, modelId]);
  const constraint = useMemo(() => getModelConstraint(modelId), [modelId]);
  const composed = useMemo(() => buildPrompt(creative, assets), [creative, assets]);
  useEffect(() => { if (!promptEdited) setPrompt(composed); }, [composed, promptEdited]);

  useEffect(() => {
    fetch("/api/models").then((r) => r.json()).then((data) => {
      const nextModels = data.models ?? [];
      setModels(nextModels);
      setModelCount(data.totalCount ?? nextModels.length);
      setMetaSource(data.source ?? "unknown");
    }).catch(() => setError("Could not load model capabilities."));
  }, []);

  useEffect(() => {
    if (!model) return;
    const ds = model.supported_durations ?? [];
    const rs = model.supported_resolutions ?? [];
    const sizes = model.supported_sizes ?? [];
    const ars = model.supported_aspect_ratios ?? [];
    if (ds.length && !ds.includes(duration)) setDuration(ds.includes(5) ? 5 : ds[0]);
    if (rs.length) {
      if (!rs.includes(resolution)) setResolution(rs.includes("720p") ? "720p" : rs[0]);
      if (outputSize) setOutputSize("");
    } else if (sizes.length) {
      if (!sizes.includes(outputSize)) setOutputSize(sizes[0]);
      if (resolution) setResolution("");
    } else {
      if (resolution) setResolution("");
      if (outputSize) setOutputSize("");
    }
    if (ars.length && !ars.includes(aspect)) setAspect(ars.includes("9:16") ? "9:16" : ars[0]);
    if (!model.generate_audio) setAudio(false);
  }, [model, duration, resolution, outputSize, aspect]);

  const patch = <K extends keyof CreativeState>(key: K, value: CreativeState[K]) => setCreative((c) => ({ ...c, [key]: value }));
  const qualityKey = resolution || outputSize;
  const estimate = useMemo(() => estimateVideoCost(model, duration, qualityKey, audio), [model, duration, qualityKey, audio]);
  const actual = job?.usage?.cost ?? null;
  const terminal = job && ["completed", "failed", "cancelled", "expired"].includes(job.status);
  const first = assets.find((a) => a.role === "first_frame");
  const last = assets.find((a) => a.role === "last_frame");
  const refs = assets.filter((a) => a.role === "reference" || a.role === "detail");
  const promptChars = countPromptChars(prompt);
  const promptLimit = constraint.promptMaxChars ?? null;
  const hardPromptOver = Boolean(promptLimit && constraint.promptLimitConfidence === "hard" && promptChars > promptLimit);
  const refLimit = constraint.maxReferenceImages ?? null;
  const hardRefOver = Boolean(refLimit !== null && constraint.referenceLimitConfidence === "hard" && refs.length > refLimit);
  const requiresSourceVideo = Boolean(constraint.requiresSourceVideo || model?.workflow === "video_edit");

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const max = 15 - assets.length;
    const list = Array.from(files).slice(0, Math.max(0, max));
    if (!list.length) return;
    setUploading(true); setError("");
    try {
      for (const file of list) {
        const bitmap = await createImageBitmap(file);
        const ratio = bitmap.width / bitmap.height;
        const width = bitmap.width; const height = bitmap.height; bitmap.close();
        if (width < 300 || height < 300) throw new Error(`${file.name}: product references should be at least 300×300 px for Kling/Seedance compatibility.`);
        if (ratio < 0.4 || ratio > 2.5) throw new Error(`${file.name}: image aspect ratio must stay between 1:2.5 and 2.5:1 for safe provider compatibility.`);
        const form = new FormData(); form.append("file", file);
        const r = await fetch("/api/uploads", { method: "POST", body: form });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Upload failed");
        setAssets((prev) => [...prev, { id: data.id, name: data.name, type: data.type, size: data.size, url: data.url, role: "reference", note: "", variant: "" }]);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }, [assets.length]);

  const setRole = (id: string, role: AssetRole) => setAssets((prev) => prev.map((a) => {
    if (a.id === id) return { ...a, role };
    if ((role === "first_frame" || role === "last_frame") && a.role === role) return { ...a, role: "reference" };
    return a;
  }));
  const removeAsset = async (id: string) => {
    setAssets((p) => p.filter((a) => a.id !== id));
    fetch(`/api/media/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
  };

  const submit = async () => {
    if (!model || !prompt.trim()) return;
    if (requiresSourceVideo) { setError(`${model.name} requires a source video. It is listed for discovery, but CTRL-B V1.2 does not yet upload source video for edit models.`); return; }
    if (hardPromptOver && promptLimit) { setError(`Prompt is ${promptChars} characters; ${model.name} accepts at most ${promptLimit}. Use “Fit to model” first.`); return; }
    if (hardRefOver && refLimit) { setError(`${model.name} accepts at most ${refLimit} active reference images. Mark extra uploads as “Not sent” or switch models.`); return; }
    setSubmitting(true); setError(""); setJob(null);
    try {
      let provider: Record<string, unknown> | undefined;
      if (providerJson.trim()) {
        try { provider = JSON.parse(providerJson); } catch { throw new Error("Expert provider JSON is invalid."); }
      }
      const r = await fetch("/api/video/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        model: model.id, prompt, duration, resolution: resolution || undefined, size: outputSize || undefined, aspect_ratio: outputSize ? undefined : aspect || undefined, generate_audio: audio,
        seed: seedEnabled ? seed : undefined, firstFrameId: first?.id, lastFrameId: last?.id, referenceIds: refs.map((a) => a.id), provider,
      }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "Submission failed"); setJob(data.job);
    } catch (e) { setError(e instanceof Error ? e.message : "Submission failed"); }
    finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (!job || terminal) return;
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/video/${encodeURIComponent(job.id)}`, { cache: "no-store" });
        const data = await r.json(); if (!r.ok) throw new Error(data.error || "Polling failed"); setJob(data);
      } catch (e) { setError(e instanceof Error ? e.message : "Polling failed"); }
    }, 5000);
    return () => clearTimeout(timer);
  }, [job, terminal]);

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="brandmark">CB</div><div><strong>CTRL-B</strong><span>VIDEO STUDIO</span></div></div>
      <div className="topmeta"><span className={`dot ${metaSource === "openrouter-live" ? "ok" : "warn"}`} />{metaSource === "openrouter-live" ? `Live catalog · ${modelCount} video models` : metaSource === "loading" ? "Loading video catalog" : `Fallback catalog · ${modelCount} models`}<span className="divider" />OpenRouter engine</div>
    </header>

    <section className="workspace">
      <div className="control-column">
        <div className="hero-copy"><span className="eyebrow">PRODUCT VIDEO GENERATOR</span><h1>Build product ads with <em>control.</em></h1><p>Reference-first workflows for e-commerce hero films and UGC — tuned for product fidelity, multilingual dialogue and transparent cost.</p></div>

        <section className="card"><div className="cardhead"><div><span className="step">01</span><h2>Production setup</h2></div><span className="muted">Choose workflow + model</span></div>
          <div className="preset-grid">{PRESETS.map((p) => <button type="button" className={creative.preset === p ? "preset active" : "preset"} onClick={() => patch("preset", p)} key={p}>{p}</button>)}</div>
          <div className="grid two"><ModelPicker models={models} value={modelId} onChange={setModelId}/><Select label="Product category" value={creative.category} options={CATEGORIES} onChange={(v) => patch("category", v)}/></div>
          {model && <div className="model-cap-card">
            <div className="model-cap-head"><div><span>{companyLabel(model)}</span><strong>{model.name}</strong><code>{model.id}</code></div><div className="badges">{isFeatured(model.id) && <span>Featured</span>}{model.fallback && <span>Fallback data</span>}{model.workflow === "video_edit" && <span className="danger-badge">Video edit</span>}</div></div>
            {model.description && <p className="model-description">{model.description}</p>}
            <div className="cap-grid">
              <div className="cap"><span>Prompt text</span><LimitValue value={constraint.promptMaxChars} confidence={constraint.promptLimitConfidence}/></div>
              <div className="cap"><span>Reference images</span><LimitValue value={constraint.maxReferenceImages} confidence={constraint.referenceLimitConfidence}/></div>
              <div className="cap"><span>Duration</span><strong>{model.supported_durations?.length ? `${model.supported_durations[0]}${model.supported_durations.length > 1 ? `–${model.supported_durations.at(-1)}` : ""} sec` : "Not published"}</strong><small>{model.supported_durations?.length ? model.supported_durations.join(", ") + "s" : "live metadata unavailable"}</small></div>
              <div className="cap"><span>Quality</span><strong>{model.supported_resolutions?.length ? model.supported_resolutions.join(" → ") : model.supported_sizes?.length ? model.supported_sizes.join(" → ") : "Not published"}</strong><small>low → high</small></div>
              <div className="cap"><span>Aspect ratios</span><strong>{model.supported_aspect_ratios?.length ? model.supported_aspect_ratios.join(" · ") : "Not published"}</strong><small>OpenRouter metadata</small></div>
              <div className="cap"><span>Inputs / audio</span><strong>{model.supported_frame_images?.length ? model.supported_frame_images.map((x) => x === "first_frame" ? "First" : "Last").join(" + ") : "No frame control listed"}</strong><small>{model.generate_audio ? "Native audio available" : "No native audio advertised"}</small></div>
            </div>
            {constraint.note && <div className={requiresSourceVideo ? "model-constraint danger" : "model-constraint"}>{constraint.note}</div>}
          </div>}
        </section>

        <section className="card"><div className="cardhead"><div><span className="step">02</span><h2>Product references</h2></div><span className="counter">{assets.length}/15</span></div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
          <div className="dropzone" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); }}><div className="upload-icon">＋</div><strong>{uploading ? "Uploading…" : "Drop product images here"}</strong><span>JPG, PNG or WEBP · up to 10 MB each · 15 images max</span></div>
          <div className="variant-panel">
            <div className="grid two">
              <label className="field"><span>Product variant mode</span><select value={creative.variantMode} onChange={(e) => patch("variantMode", e.target.value as CreativeState["variantMode"])}><option value="single">Single product / one colorway</option><option value="multi_color">Same SKU · multiple colorways</option></select></label>
              {creative.variantMode === "multi_color" && <label className="field"><span>Colorway behavior</span><select value={creative.variantStrategy} onChange={(e) => patch("variantStrategy", e.target.value as CreativeState["variantStrategy"])}><option value="target_only">Render one target colorway</option><option value="lineup">Show multiple colorways as separate products</option><option value="transition">Controlled colorway transition</option></select></label>}
            </div>
            {creative.variantMode === "multi_color" && creative.variantStrategy === "target_only" && <Field label="Target colorway" value={creative.targetVariant} onChange={(v) => patch("targetVariant", v)} placeholder="e.g. Black / Burgundy / Beige"/>}
            <p>For the same shoe/product in different colors, label each image below. The prompt compiler locks geometry and branding so colorways are not treated as different designs.</p>
          </div>
          {refLimit !== null && <div className={hardRefOver ? "limit-note danger" : refs.length >= refLimit ? "limit-note warn" : "limit-note"}><strong>{model?.name}: {refLimit} reference image{refLimit === 1 ? "" : "s"} {constraint.referenceLimitConfidence === "hard" ? "max" : "recommended"}</strong><span>{refs.length} active reference{refs.length === 1 ? "" : "s"}. Use “Not sent” on extra uploads if needed.</span></div>}
          {assets.length > 0 && <div className="asset-grid">{assets.map((a) => <div className="asset" key={a.id}><img src={a.url} alt={a.name}/><button className="asset-x" onClick={() => removeAsset(a.id)}>×</button><div className="asset-controls"><select value={a.role} onChange={(e) => setRole(a.id, e.target.value as AssetRole)}><option value="reference">Product reference</option><option value="detail">Detail reference</option><option value="exclude">Not sent · keep uploaded</option>{model?.supported_frame_images?.includes("first_frame") && <option value="first_frame">First frame</option>}{model?.supported_frame_images?.includes("last_frame") && <option value="last_frame">Last frame</option>}</select>{creative.variantMode === "multi_color" && <input value={a.variant} placeholder="Colorway e.g. Black" onChange={(e) => setAssets((p) => p.map((x) => x.id === a.id ? { ...x, variant: e.target.value } : x))}/>}<input value={a.note} placeholder="e.g. side view / sole detail" onChange={(e) => setAssets((p) => p.map((x) => x.id === a.id ? { ...x, note: e.target.value } : x))}/></div></div>)}</div>}
        </section>

        <section className="card"><div className="cardhead"><div><span className="step">03</span><h2>Creative direction</h2></div><span className="muted">Structured prompt control</span></div>
          <div className="grid two"><Field label="Product description" value={creative.productDescription} onChange={(v) => patch("productDescription", v)} placeholder="What product is this? Key material, finish, hero detail…"/><Field label="Campaign goal" value={creative.campaignGoal} onChange={(v) => patch("campaignGoal", v)}/><Field label="Environment / set" value={creative.environment} onChange={(v) => patch("environment", v)}/><Field label="Lighting" value={creative.lighting} onChange={(v) => patch("lighting", v)}/><Field label="Tone / visual style" value={creative.tone} onChange={(v) => patch("tone", v)}/><Field label="Color palette" value={creative.palette} onChange={(v) => patch("palette", v)}/><Field label="Camera / lens / shot" value={creative.camera} onChange={(v) => patch("camera", v)}/><Field label="Motion direction" value={creative.motion} onChange={(v) => patch("motion", v)}/></div>
          <div className="separator"><span>UGC / TALENT</span></div>
          <div className="grid three"><Select label="Talent" value={creative.talent} options={["None", "Female 20s", "Female 30s", "Male 20s", "Male 30s", "Custom talent in prompt"]} onChange={(v) => patch("talent", v)}/><Select label="Spoken language" value={creative.language} options={["English", "Arabic", "Egyptian Arabic", "Gulf Arabic", "French", "Custom"]} onChange={(v) => patch("language", v)}/><Select label="Delivery" value={creative.delivery} options={["Natural, confident and conversational", "Premium and calm", "Friendly testimonial", "Energetic creator", "Educational", "Direct-response sales"]} onChange={(v) => patch("delivery", v)}/></div>
          {creative.talent !== "None" && <div className="grid two"><Field label="Dialect / voice note" value={creative.dialect} onChange={(v) => patch("dialect", v)} placeholder="e.g. natural Egyptian Cairo dialect"/><Field label="Dialogue / script" value={creative.script} onChange={(v) => patch("script", v)} placeholder="Exact line to be spoken" rows={3}/></div>}
          <div className="grid two"><Field label="Brand constraints" value={creative.brandConstraints} onChange={(v) => patch("brandConstraints", v)} rows={3}/><Field label="Negative instructions" value={creative.negative} onChange={(v) => patch("negative", v)} rows={3}/></div>
          <div className="promptbox"><div className="prompthead"><span>PROVIDER PROMPT</span><div><button onClick={() => { setPrompt(composed); setPromptEdited(false); }}>Rebuild concise</button>{promptLimit && <button onClick={() => { setPrompt(fitPromptToChars(prompt || composed, safePromptTarget(promptLimit))); setPromptEdited(true); }}>Fit to model</button>}<button onClick={() => navigator.clipboard?.writeText(prompt)}>Copy</button></div></div><textarea value={prompt} onChange={(e) => { setPrompt(e.target.value); setPromptEdited(true); }} rows={12}/><div className={`prompt-budget ${hardPromptOver ? "danger" : promptLimit && promptChars > safePromptTarget(promptLimit) ? "warn" : "ok"}`}><span>{promptLimit ? `${promptChars.toLocaleString()} / ${promptLimit.toLocaleString()} chars` : `${promptChars.toLocaleString()} chars · provider limit not published`}</span>{promptLimit && <b>{constraint.promptLimitConfidence === "hard" ? "Hard provider limit" : "Safe recommendation"}</b>}</div></div>
          {promptLimit && <div className={hardPromptOver ? "limit-note danger" : promptChars > safePromptTarget(promptLimit) ? "limit-note warn" : "limit-note"}><strong>{hardPromptOver ? "Prompt is too long for this model" : `Safe prompt budget: ${safePromptTarget(promptLimit).toLocaleString()} chars`}</strong><span>{hardPromptOver ? `This provider will reject more than ${promptLimit.toLocaleString()} characters. Use “Fit to model” before generating.` : "Your structured fields can stay detailed; the provider prompt should stay concise and load-bearing."}</span></div>}
        </section>

        <section className="card"><div className="cardhead"><div><span className="step">04</span><h2>Output controls</h2></div><span className="muted">Only supported options are shown</span></div>
          <PillGroup label="Duration" values={model?.supported_durations ?? [5]} selected={duration} onChange={(v) => setDuration(Number(v))}/>
          {!outputSize && <PillGroup label="Aspect ratio" values={model?.supported_aspect_ratios ?? []} selected={aspect} onChange={setAspect}/>}
          <PillGroup label="Resolution" values={model?.supported_resolutions ?? []} selected={resolution} onChange={setResolution}/>
          {!model?.supported_resolutions?.length && <PillGroup label="Output size" values={model?.supported_sizes ?? []} selected={outputSize} onChange={setOutputSize}/>}
          <div className="toggle-row"><div><span>Native audio</span><small>{model?.generate_audio ? "Generate dialogue / ambience with the video" : "Not advertised by this model"}</small></div><button type="button" disabled={!model?.generate_audio} className={audio ? "switch on" : "switch"} onClick={() => setAudio((v) => !v)}><i /></button></div>
          <div className="toggle-row"><div><span>Deterministic seed</span><small>Useful for controlled retries when the provider honors seed</small></div><button type="button" className={seedEnabled ? "switch on" : "switch"} onClick={() => setSeedEnabled((v) => !v)}><i /></button></div>
          {seedEnabled && <Field label="Seed" value={String(seed)} onChange={(v) => setSeed(Number(v) || 0)}/>} 
          <button className="expert-link" type="button" onClick={() => setExpertOpen((v) => !v)}>{expertOpen ? "Hide" : "Show"} expert provider options</button>
          {expertOpen && <div className="expert"><p>Advanced JSON passed as OpenRouter <code>provider</code>. Use only parameters allowed by the selected model metadata.</p><textarea rows={5} value={providerJson} onChange={(e) => setProviderJson(e.target.value)} placeholder={'{\n  "options": {}\n}'}/>{model?.allowed_passthrough_parameters?.length ? <small>Advertised passthrough: {model.allowed_passthrough_parameters.join(", ")}</small> : <small>No passthrough parameters advertised.</small>}</div>}
        </section>
      </div>

      <aside className="result-column">
        <div className="sticky">
          <section className="cost-card"><div className="cost-head"><span>ESTIMATED GENERATION</span><span className="live-dot">LIVE</span></div><div className="cost-main"><strong>{money(estimate)}</strong><span>≈ {estimate === null ? "—" : money(estimate * fxRate, "EGP")}</span></div><div className="cost-break"><span>{model?.name ?? "Model"}</span><b>{duration}s · {qualityKey || "dynamic quality"}{outputSize ? "" : ` · ${aspect}`}</b><span>Audio</span><b>{audio ? "On" : "Off"}</b><span>References</span><b>{refs.length + Number(Boolean(first)) + Number(Boolean(last))}</b><span>USD/EGP rate</span><label className="fx-mini"><input type="number" min="1" step="0.01" value={fxRate} onChange={(e) => setFxRate(Math.max(1, Number(e.target.value) || 1))}/></label></div><p className="estimate-note">Estimate uses live OpenRouter pricing metadata when recognizable, with curated fallback pricing for featured models. Final OpenRouter usage is shown after completion.</p></section>
          <button className="generate" type="button" disabled={submitting || !model || !prompt.trim() || hardPromptOver || hardRefOver || requiresSourceVideo} onClick={submit}><span>{requiresSourceVideo ? "SOURCE VIDEO REQUIRED" : submitting ? "SUBMITTING…" : job && !terminal ? "GENERATION RUNNING" : "GENERATE VIDEO"}</span><b>{estimate === null ? "Cost after render" : money(estimate)}</b></button>
          {error && <div className="errorbox"><strong>Studio notice</strong><p>{error}</p></div>}

          <section className="preview-card"><div className="preview-head"><div><span>OUTPUT MONITOR</span><strong>{job ? job.status.replace("_", " ") : "Ready"}</strong></div>{job && <code>{job.id}</code>}</div>
            {!job && <div className="empty-preview"><div className="frame"><div className="play">▶</div></div><strong>Your video will appear here</strong><p>Configure the product, references and output settings, then generate.</p></div>}
            {job && job.status !== "completed" && !["failed", "cancelled", "expired"].includes(job.status) && <div className="processing"><div className="spinner"/><strong>{job.status === "pending" ? "Queued on OpenRouter" : "Generating video"}</strong><p>We poll the job every 5 seconds. You can keep this tab open.</p><div className="progress"><i /></div></div>}
            {job && ["failed", "cancelled", "expired"].includes(job.status) && <div className="processing failed"><strong>Generation {job.status}</strong><p>{job.error || "OpenRouter returned a terminal status."}</p></div>}
            {job?.status === "completed" && <div className="completed"><video controls playsInline src={`/api/video/${job.id}/content`} /><div className="actual"><div><span>ACTUAL COST</span><strong>{money(actual)}</strong><small>≈ {actual === null ? "—" : money(actual * fxRate, "EGP")}</small></div><a href={`/api/video/${job.id}/content`} download>Download MP4 ↓</a></div></div>}
          </section>

          <section className="fidelity-card"><span className="eyebrow">FIDELITY CHECKLIST</span><ul><li><i>01</i>Upload front / detail views for product identity.</li><li><i>02</i>Use First Frame only when exact starting composition matters.</li><li><i>03</i>Describe what must stay unchanged in the final prompt.</li><li><i>04</i>Test cheap/short settings first, then scale quality.</li></ul></section>
        </div>
      </aside>
    </section>
    <footer><span>CTRL-B Video Studio · Experimental V1.2</span><span>No login · No database · Server-side OpenRouter key</span></footer>
  </main>;
}
