# Yosi

> **Yosi** (Tamil: _"Think"_) — an open-source, AI-powered [BlockNote](https://www.blocknotejs.org/) editor scaffolding.

Yosi is a "Zen mode" writing canvas built on the BlockNote block editor, wired up
to **bring-your-own-key** AI from DeepSeek, OpenAI, or Google Gemini. It ships as
a pnpm + Turborepo monorepo so the editor can be shared between a Next.js web app
and a Plasmo browser extension.

It's intended as a **starting point** you can fork: the editor, AI integration,
provider switching, theming, and a hardened API proxy are all in place.

![Yosi editor — Zen writing canvas with AI slash commands](apps/web/public/Yosi_BG_dark.webp)

---

## Features

- 📝 **Notion-style block editor** — powered by [BlockNote](https://www.blocknotejs.org/) (slash `/` commands, drag-and-drop blocks, formatting toolbar).
- 🤖 **AI writing assistant** — inline AI menu and slash commands (Improve Writing, Rewrite, Brainstorm, Proofread, …) via [`@blocknote/xl-ai`](https://www.blocknotejs.org/docs/features/ai).
- 🔌 **Multi-provider, bring-your-own-key** — switch between **DeepSeek**, **OpenAI**, and **Google Gemini** at runtime. Your key lives in your browser, not on a server.
- 🎨 **Light / dark themes** with custom background wallpapers and a custom font-style block.
- 🛡️ **Hardened AI proxy** — a server route that injects the key into upstream calls and is **host-allowlisted** to prevent SSRF.
- 🧩 **Monorepo** — shared `@yosi/ui` package consumed by both the web app and the browser extension.

## Tech stack

| Area        | Choice                                                          |
| ----------- | -------------------------------------------------------------- |
| Monorepo    | [pnpm](https://pnpm.io/) workspaces + [Turborepo](https://turbo.build/) |
| Web         | [Next.js 16](https://nextjs.org/) (App Router, edge runtime)   |
| Extension   | [Plasmo](https://docs.plasmo.com/)                             |
| Editor      | [BlockNote](https://www.blocknotejs.org/)                      |
| AI SDK      | [Vercel AI SDK](https://sdk.vercel.ai/) (`@ai-sdk/*`)          |
| UI          | [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS v4          |
| Icons       | [lucide-react](https://lucide.dev/)                            |

## Repository layout

```
yosi-monorepo/
├── apps/
│   ├── web/                 # Next.js dashboard (the Canvas)
│   │   └── app/
│   │       ├── api/ai/proxy # Key-injecting, allowlisted AI proxy route
│   │       └── components/   # Web-specific wrappers (Canvas, dialogs)
│   └── extension/           # Plasmo browser extension (the Companion)
└── packages/
    └── ui/                  # @yosi/ui — shared editor, AI config, helpers
        └── src/
            ├── components/  # BlockNote editor + error/loading boundaries
            └── lib/         # AI transport, config hook, constants, AI commands
```

## Getting started

**Prerequisites:** Node.js ≥ 18 and [pnpm](https://pnpm.io/installation) 9 (`corepack enable`).

```bash
# 1. Install dependencies (from the repo root)
pnpm install

# 2. Start the web app (http://localhost:3000)
pnpm dev --filter=web

# Or run everything (web + extension) via Turborepo
pnpm dev
```

Then open <http://localhost:3000>, click the **🔑 key icon** (top-right) to open
**AI Settings**, pick a provider + model, paste your API key, and save. The editor
is ready — type `/` for block commands or select text and use the AI button.

> **No environment variables are required.** Yosi uses a bring-your-own-key model:
> keys are entered in the UI and stored in your browser's `localStorage`. See
> [Security model](#security-model) below.

### Getting an API key

| Provider | Where to get a key                                               | Cheapest model in the picker |
| -------- | --------------------------------------------------------------- | ---------------------------- |
| DeepSeek | <https://platform.deepseek.com/>                                | `deepseek-chat`              |
| OpenAI   | <https://platform.openai.com/api-keys>                          | `gpt-4o-mini`                |
| Google   | <https://aistudio.google.com/apikey>                            | `gemini-2.0-flash-lite`      |

Model options live in [`packages/ui/src/lib/constants.ts`](packages/ui/src/lib/constants.ts)
and are ordered cheapest-first (the first entry becomes the default for a provider).

## Scripts

Run from the repo root:

```bash
pnpm dev               # Run all apps in dev mode (Turborepo)
pnpm dev --filter=web  # Run only the web app
pnpm build             # Build all packages and apps
pnpm lint              # Lint everything
pnpm format            # Prettier across the repo
```

Package-scoped:

```bash
pnpm --filter @yosi/ui test   # Run the shared package's Vitest suite
```

## Security model

Yosi is a **bring-your-own-key** client app. Understand the trade-offs before deploying:

- **Keys are stored in the browser** (`localStorage`) and sent per-request as the
  `X-API-Key` header. They are never persisted on the server. This is convenient
  for a personal/self-hosted tool, but `localStorage` is readable by any script
  running on the page — only add dependencies and extensions you trust.
- **The proxy route is host-allowlisted.** [`/api/ai/proxy`](apps/web/app/api/ai/proxy/route.ts)
  only forwards HTTPS requests to `api.openai.com`, `api.deepseek.com`, and
  `generativelanguage.googleapis.com`. This prevents the endpoint from being used
  as an open proxy / SSRF vector against internal or cloud-metadata services. If
  you add a provider, add its host to `ALLOWED_HOSTS`.
- **If you deploy publicly**, anyone who can reach your URL can use the proxy with
  _their own_ key (the server adds no key of its own). Put it behind auth or
  network restrictions if that isn't what you want.

## Deployment

The web app is a standard Next.js App Router project and deploys anywhere Next.js
runs (e.g. [Vercel](https://vercel.com/)):

```bash
pnpm build --filter=web
pnpm --filter web start   # serve the production build
```

The proxy route uses the **edge runtime** for low-latency streaming. No server
environment variables are needed for the default providers.

## Roadmap

Yosi is scaffolding — the editor and AI core are done; these surfaces are stubbed
for you to build on (see [`Project Yosi v1.md`](Project%20Yosi%20v1.md) for the full PRD):

- Browser extension sidebar + "Ghost" overlay (grammar underlines in any input).
- Persona / system-prompt switching.
- Persistence & auth (Supabase) for syncing documents and custom personas.

## Contributing

Issues and PRs are welcome. Please run `pnpm lint` and `pnpm --filter @yosi/ui test`
before opening a PR.

## License

MIT — see [`LICENSE`](LICENSE).
