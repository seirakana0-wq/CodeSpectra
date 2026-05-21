# CODEREVIEW.AI

Brutally honest AI code review for any public GitHub URL. Stateless. No DB. No auth. Streams as it reasons.

## What it does

Paste a GitHub URL — repo, PR, file, or directory — and get a structured review covering security, performance, architecture, and style. Powered by an OpenAI-compatible LLM (defaults to MiMo-V2.5-Pro).

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind v3** with a dark-brutalism design system
- **Server-Sent Events** for streamed output
- **GitHub public API** (no OAuth) — works on any public repo
- **Zero database**, zero state, zero tracking

## Run locally

```bash
cp .env.example .env.local
# fill in LLM_API_KEY (and optionally GITHUB_TOKEN to lift rate limits)

npm install
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel

```bash
vercel --prod
# or: push to GitHub, import in vercel.com, set env vars, deploy
```

Required env vars:

| key | required | default |
| --- | --- | --- |
| `LLM_API_KEY` | yes | — |
| `LLM_BASE_URL` | no | `https://token-plan-sgp.xiaomimimo.com/v1` |
| `LLM_MODEL` | no | `mimo-v2.5-pro` |
| `GITHUB_TOKEN` | no | unauthenticated (60 req/h/IP) |

## URL formats supported

```
github.com/owner/repo
github.com/owner/repo/pull/123
github.com/owner/repo/blob/main/path/file.ts
github.com/owner/repo/tree/main/subdir
```

## Limits

- **240 KB** total input size (roughly 25 files or full PR diff)
- **80 KB** per file (tail truncated)
- **25 files** max per request
- Skips `node_modules`, lockfiles, minified bundles, build artifacts

## Theme

Dark brutalism — ink black, bone white, acid yellow accents, hard shadows, sharp corners, mono type.

## License

MIT
