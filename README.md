# CTRL-B Video Studio — V1

A video-only e-commerce / UGC production studio adapted from the architecture and workflow demonstrated by OpenRouter's official **Multimedia Explorer** example. This build deliberately removes login, OAuth, image generation, moodboards and database requirements.

## What is implemented

- Six initial OpenRouter video models (with the current Kling Standard slug `kwaivgi/kling-v3.0-std`)
- Runtime capability refresh from `GET /api/v1/videos/models`
- Fallback capabilities/pricing snapshot so the UI stays usable if model discovery fails
- Product Hero, UGC, Cosmetics, Perfume and Footwear creative presets
- Structured prompt builder for environment, lighting, camera, motion, tone, palette, dialogue and brand constraints
- Up to 15 JPG/PNG/WEBP product references, uploaded one-by-one
- Per-image roles: product reference, detail reference, first frame, last frame
- Dynamic duration / resolution / aspect-ratio / audio controls
- Optional seed and expert provider JSON
- Estimated USD + EGP cost before generation
- OpenRouter async submit → 5-second polling → MP4 proxy/download
- Actual OpenRouter `usage.cost` shown after completion
- No login, no database
- API key stays server-side
- Same-origin checks + lightweight per-IP in-memory rate limits for the no-login test
- Use an OpenRouter API key with a hard spending limit as the final abuse guard

## Important image-reference requirement

OpenRouter providers need stable public HTTPS image URLs. Local upload files are exposed through `/api/media/:id`; therefore set `APP_URL=https://studio.ctrl-b.co` in production. Text-to-video can be tested locally without it, but uploaded references cannot be fetched by providers from localhost.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Hostinger deployment

1. Put this project in a private GitHub repository.
2. Hostinger → Websites → Add Website → Deploy Web App → Import Git Repository.
3. Use Node.js 22.x.
4. Add environment variables from `.env.example` in the Hostinger Node.js dashboard.
5. Deploy first, then connect `studio.ctrl-b.co`.
6. Set `APP_URL=https://studio.ctrl-b.co` and redeploy before using uploaded references.

## OpenRouter

Create a dedicated limited API key and put it only in `OPENROUTER_API_KEY`. For the initial test, keep OpenRouter Auto Top-Up off and use a small credit balance.

## Notes on pricing

The studio prefers live `pricing_skus` from OpenRouter when their unit can be recognized. Because SKU naming can vary, it also contains curated fallback pricing for the featured production models. The final amount shown after completion always comes from OpenRouter's `usage.cost`, which is the authoritative actual cost.

## Model slugs

- `bytedance/seedance-2.0-mini`
- `bytedance/seedance-2.5`
- `kwaivgi/kling-v3.0-pro`
- `kwaivgi/kling-v3.0-std`
- `kwaivgi/kling-video-o1`
- `bytedance/seedance-2.0`

## V1.1 — prompt budgets + product colorways

This build adds provider-aware preflight controls for real-world e-commerce workflows:

- Live provider prompt character counter.
- Hard 2,500-character preflight for Kling Video 3.x / O1 so known provider failures are blocked before submission.
- `Fit to model` deterministic local compaction (no LLM/API cost).
- Compact reference mapping: product-fidelity rules are written once instead of repeated for every uploaded image.
- Same-SKU multi-color workflow with per-image colorway labels and three strategies: target color only, lineup, or controlled color transition.
- `Not sent · keep uploaded` lets the workspace keep up to 15 assets while respecting smaller provider reference limits.
- Kling Video O1 6-reference preflight.
- Safe image preflight (minimum 300 px dimensions, aspect ratio 1:2.5–2.5:1).
- Cleaner upstream OpenRouter error messages.

See `PROMPT-AND-VARIANTS.md` for usage notes.

## V1.2 — Dynamic OpenRouter video catalog

CTRL-B no longer uses a fixed model whitelist. `/api/models` reads OpenRouter's live `GET /api/v1/videos/models` catalog and returns every currently available video-generation model. The requested production models remain curated as featured entries and have local fallback capability/pricing metadata for temporary catalog outages.

The model picker is searchable and grouped by company. Selecting a model shows:

- Prompt character limit when documented (`Hard`, `Safe recommendation`, or `Not published`)
- Reference-image count when documented
- Supported durations
- Resolutions from low to high, or exact output sizes when that is what OpenRouter publishes
- Aspect ratios
- First/last-frame support
- Native audio support
- Provider-specific passthrough parameters in Expert options

Featured production models include Google Veo 3.1 / Lite / Fast, OpenAI Sora 2 Pro, ByteDance Seedance 1.5/2.x, Kling 3 Pro/Standard/O1, and Runway Gen-4.5/Aleph 2.

`runway/aleph-2` is intentionally discoverable but generation is blocked in V1.2 because Aleph is a source-video editing workflow. Add source-video upload before enabling its submit path.

OpenRouter does not currently publish a universal prompt-character limit or reference-image count for every video model in `/videos/models`. CTRL-B therefore never invents a hard number: unknown values are explicitly displayed as `Not published by OpenRouter`, while known provider limits use curated constraint overlays.
