# CTRL-B Video Studio — Deployment Checklist

## 1. OpenRouter
- Create a dedicated API key named `CTRL-B Video Studio`.
- Put a hard spending limit on the key (recommended: the same amount as your test credits).
- Keep Auto Top-Up OFF during the test.
- Do not put the key in any `NEXT_PUBLIC_*` variable.

## 2. GitHub
- Create a private repository.
- Upload/push the contents of this project.

## 3. Hostinger
- Websites → Add Website → Deploy Web App → Import Git Repository.
- Select the private repository.
- Framework: Next.js (auto-detected).
- Node.js: 22.x.
- Build command: `npm run build`.

## 4. Environment variables
Copy `.env.example`, then set at minimum:

```env
OPENROUTER_API_KEY=sk-or-v1-...
APP_URL=https://studio.ctrl-b.co
USD_TO_EGP_RATE=50.00
OPENROUTER_APP_NAME=CTRL-B Video Studio
MAX_UPLOAD_FILES=15
MAX_UPLOAD_MB=10
UPLOAD_TTL_HOURS=24
MAX_GENERATIONS_PER_HOUR=10
MAX_UPLOADS_PER_HOUR=60
```

## 5. Domain
- Connect `studio.ctrl-b.co` to the Node.js website in Hostinger.
- Confirm SSL/HTTPS works.
- Confirm `https://studio.ctrl-b.co/api/models` returns the six studio models.

## 6. Smoke tests before spending
1. Open Studio and verify model metadata says `Live model metadata`.
2. Select each model and verify duration/resolution/aspect options change.
3. Upload a JPG product reference; open its `/api/media/...` URL in an incognito tab and verify it returns the image directly.
4. Check USD/EGP estimate changes with duration/resolution/audio.
5. Run the cheapest short test first.
6. Verify status moves pending → in progress → completed.
7. Verify video playback and MP4 download.
8. Verify actual OpenRouter cost is displayed after completion.

## 7. First quality test matrix
- Same product images + same prompt.
- 5 seconds where possible.
- 720p.
- 9:16 for UGC / Reels.
- Audio OFF for first visual comparison.
- Compare Seedance 2.0 Mini, Seedance 2.5, Kling 3.0 Standard and Kling 3.0 Pro before spending on longer clips.
