# Prompt budgets and product colorways

## Why Kling can return `prompt: size must be between 0 and 2500`
Kling Video 3.x providers enforce a 2,500-character prompt ceiling. CTRL-B Studio now blocks over-limit Kling requests before they reach OpenRouter and shows a live character budget.

- **Rebuild concise** regenerates the provider prompt from the structured fields using a compact reference map.
- **Fit to model** locally compacts an edited prompt to a safe budget (94% of the provider ceiling). It makes no LLM call and adds no text-model cost.
- Structured creative fields can remain detailed; the final provider prompt should contain only load-bearing production instructions.

## Same product, multiple colors
Choose **Same SKU · multiple colorways** in Product References. Label each uploaded image with its colorway (Black, White, Burgundy, etc.). Then choose one behavior:

1. **Render one target colorway** — other colors teach geometry/identity only and must not appear.
2. **Show multiple colorways as separate products** — each color remains a separate physical item; no color blending.
3. **Controlled colorway transition** — only color changes; geometry, logo placement and construction remain locked.

Use the image note for angle/detail (`side view`, `sole`, `logo close-up`) and the colorway field only for SKU color.

## Reference limits
The studio can store up to 15 uploaded images. The selected provider may accept fewer active references. Use **Not sent · keep uploaded** on any image that should remain in the workspace but not be included in the current request.
