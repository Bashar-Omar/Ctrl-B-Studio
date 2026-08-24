# CTRL-B Video Studio V1.2 — Dynamic Model Catalog

## What changed

- Replaced the six-model whitelist with the complete live OpenRouter video catalog from `GET /api/v1/videos/models`.
- Added curated featured models:
  - `google/veo-3.1`
  - `google/veo-3.1-lite`
  - `google/veo-3.1-fast`
  - `openai/sora-2-pro`
  - `bytedance/seedance-1-5-pro`
  - `bytedance/seedance-2.0-mini`
  - `bytedance/seedance-2.0-fast`
  - `bytedance/seedance-2.0`
  - `bytedance/seedance-2.5`
  - `kwaivgi/kling-v3.0-std`
  - `kwaivgi/kling-v3.0-pro`
  - `kwaivgi/kling-video-o1`
  - `runway/gen-4.5`
  - `runway/aleph-2`
- Added a searchable custom model picker.
- Grouped models by company; featured models sort first inside their company.
- Added capability panel for every selected model:
  - prompt limit
  - reference-image limit
  - duration(s)
  - quality/resolution low → high
  - exact sizes when applicable
  - aspect ratios
  - first/last-frame controls
  - native audio
- Model capabilities remain live-first. Curated fallback data is only used when fields are absent or the catalog is temporarily unavailable.
- Removed server-side fixed whitelist. Any model actually listed by OpenRouter can now be submitted.
- Added `size` support for models that expose exact pixel dimensions rather than named resolutions.
- Kept prompt/reference safety overlays from V1.1.
- Added Runway constraints:
  - Gen-4.5: 1,000-character hard prompt ceiling (direct Runway API contract).
  - Aleph 2: source-video editing model, 1,000-character prompt, up to 5 keyframes; submit disabled until video upload is implemented.
- Unknown text/image limits are shown as `Not published by OpenRouter` instead of guessed values.

## Deployment

No new environment variables are required.

Replace the repository contents with V1.2, commit, push, and let Hostinger redeploy. The previous Hostinger compatibility fix (`next build --webpack` + `next.config.mjs`) is preserved.

## QA

- TypeScript/TSX syntax transpilation: 18 files checked, 0 syntax failures.
- Verified the old `MODEL_ORDER.includes(...)` submit whitelist is gone.
- Verified dynamic model discovery, model grouping/search UI, exact-size request support, and source-video guard are present.
