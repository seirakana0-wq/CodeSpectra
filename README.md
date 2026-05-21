# ⚡ CodeSpectra

> Instant AI code review for any public GitHub URL. Paste a link, get the verdict.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

---

## ✨ Features

- 🔍 **Security Analysis** — SQL injection, XSS, secrets in code, auth bypass
- ⚡ **Performance Review** — N+1 queries, blocking I/O, memory leaks, hot paths
- 🏗 **Architecture Audit** — Coupling, abstractions, error handling, testability
- 🎨 **Glassmorphism UI** — Modern dark aesthetic with aurora effects
- 📡 **Real-time Streaming** — SSE-powered live output as AI thinks
- 🔒 **Zero State** — No database, no auth, no tracking, no cookies

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/seirakana0-wq/CodeSpectra.git
cd CodeSpectra

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local — add your LLM_API_KEY

# Run development server
pnpm dev
# → http://localhost:3000
```

## 🔧 Environment Variables

| Variable | Required | Default |
| --- | --- | --- |
| `LLM_API_KEY` | ✅ | — |
| `LLM_BASE_URL` | ❌ | `https://api.openai.com/v1` |
| `LLM_MODEL` | ❌ | `gpt-4o` |
| `GITHUB_TOKEN` | ❌ | Unauthenticated (60 req/h/IP) |

## 📦 Deploy to Vercel

```bash
vercel --prod
```

Or push to GitHub → import at [vercel.com](https://vercel.com) → set env vars → deploy.

## 🔗 Supported URL Formats

```
github.com/owner/repo
github.com/owner/repo/pull/123
github.com/owner/repo/blob/main/path/file.ts
github.com/owner/repo/tree/main/subdir
```

## ⚙️ Limits

| Limit | Value |
| --- | --- |
| Total input size | 240 KB (~25 files) |
| Per file | 80 KB (tail truncated) |
| Max files per request | 25 |
| Skipped | `node_modules`, lockfiles, minified bundles, build artifacts |

## 🎨 Design

Glassmorphism dark theme with:

- Aurora gradient background with subtle ambient lighting
- Translucent glass surfaces with backdrop blur
- Smooth animations (fade-in, slide-up, stagger)
- Inter + JetBrains Mono typography
- Purple accent color system
- Inspired by Linear, Vercel, Arc Browser, Raycast

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.5
- **Styling:** Tailwind CSS 3.4
- **AI:** OpenAI-compatible API via SSE streaming
- **GitHub:** Public API (no OAuth required)
- **State:** Zero — fully stateless

## 📄 License

MIT — use it however you want.

---

<p align="center">
  Built with ⚡ by <a href="https://github.com/seirakana0-wq">seirakana0-wq</a>
</p>
