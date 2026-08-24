# CTRL-B Video Studio V1.1 patch summary

## Fixes
- Prevents Kling 3.x / Video O1 prompts over 2,500 characters from being submitted.
- Adds prompt character budget + hard/recommended status.
- Adds `Fit to model` local compaction with a safe 94% target.
- Removes repeated per-reference fidelity boilerplate from prompt compilation.
- Cleans raw upstream OpenRouter errors into actionable studio messages.

## Multi-color footwear / SKU workflow
- New `Same SKU · multiple colorways` mode.
- Per-image `Colorway` label.
- Strategies: one target color, multi-color lineup, controlled color transition.
- Compiler explicitly locks geometry/logo/material construction and prevents color blending.

## Reference handling
- `Not sent · keep uploaded` role keeps assets in the workspace but excludes them from the current request.
- Kling Video O1 hard preflight at 6 reference images.
- Seedance 2.0/Mini show conservative 9-reference recommendations; Seedance 2.5 keeps the studio's 15-upload workspace.
- Image client preflight: >=300px both dimensions and ratio 0.4–2.5.

## Deployment compatibility retained
- `npm run build` uses `next build --webpack` for the Hostinger GLIBC workaround.
- `next.config.mjs` replaces `next.config.ts`.

## Files changed/new
- components/studio.tsx
- app/globals.css
- app/api/video/submit/route.ts
- lib/openrouter.ts
- lib/types.ts
- lib/prompt-builder.ts
- lib/model-constraints.ts (new)
- package.json
- next.config.mjs
- README.md
- PROMPT-AND-VARIANTS.md (new)
