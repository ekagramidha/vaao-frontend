# Frontend — Voice AI Agent Optimizer widget

Vue 3 · Vite · TypeScript · Tailwind v4 · shadcn-style components. Independent of the backend; talks to it only over the documented API.

## Run

```bash
npm install
cp .env.example .env      # VITE_API_BASE_URL, VITE_DEFAULT_LOCATION_ID
npm run dev               # http://localhost:5173
```

Runs standalone against `VITE_DEFAULT_LOCATION_ID`, so the whole product is usable in a browser tab without HighLevel. Inside the iframe the sub-account id arrives from the loader instead.

| Script | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `vue-tsc --build` then `vite build` — types are part of the build, not optional |
| `npm run typecheck` | `vue-tsc --noEmit` |

## Layout

```
src/
├── assets/styles/index.css   all theme tokens (see below)
├── components/ui/            base primitives, shadcn-style
├── components/               domain components (IssueCard, RecommendationCard, PromptDiff, …)
├── composables/              useJobRunner — 202 → poll → refresh
├── layouts/AppShell.vue      header, agent switcher, data-source badge
├── views/                    AgentList · AgentWorkspace · TestRun
├── router/                   hash history
├── stores/                   pinia: agents, optimizer
├── services/                 api client + endpoints, embed bridge
├── lib/                      cn, formatters, line diff
└── types/api.ts              response shapes
```

### Theming

Every colour resolves to a CSS custom property in `src/assets/styles/index.css`. No component hard-codes one. Re-skinning to match an agency's white-label palette means editing that one block.

Two groups: the shadcn surface/text/border scale, and semantic tokens this product needs — `--severity-critical|high|medium|low`, `--pass`, `--fail`, `--errored`, `--advisory`. The semantic set exists so "a critical issue is red" is one decision rather than one repeated across a badge, a progress bar and a table row. `@theme inline` exposes them all as utilities (`bg-severity-high`, `text-advisory`).

Both light and dark are defined; `.dark` on the root switches.

### On shadcn

shadcn is copy-into-your-repo by design, so `components/ui/` is hand-written in that style rather than pulled by the CLI. Same conventions — `cva` variants, a `class` prop merged with `cn()` so callers can override, reka-ui for behaviour (Tabs, Dialog) — but we own the files and they read from our tokens.

`Dialog.vue` is deliberately one composed component rather than eight primitives: every dialog here is the same shape (a titled panel holding a transcript or a diff), so exposing the full set to reassemble each time would be ceremony without benefit.

### State

Two pinia stores. `agents` owns selection, the overview payload and version history. `optimizer` owns all three loops together — not split per loop, because they are one workflow: analysis produces the issues test generation consumes, and both feed the recommender, so a single `loadAll` is what keeps the UI honest after an apply.

### Long-running work

`useJobRunner` starts a job, polls `/jobs/:id` every 2s, exposes `isRunning` / `progressLabel` / `progressPercent`, and calls `onSuccess` to refresh exactly what the job produced. A single failed poll retries rather than abandoning a job still running server-side. The timer is cleared on scope dispose, so navigating mid-run leaves no request loop behind.

Progress messages come straight from the backend worker — "Ran 'Upset overcharge caller wants manager'" — because that tells a user what is happening in a way a percentage cannot.

### Routing

Hash history, deliberately. The widget is static files framed from a HighLevel page on a possibly white-label domain; hash routing needs no server rewrite rules, so the same build drops onto any static host. The URL is never visible to a user.

### Embedding

`services/embed.ts` resolves the sub-account from, in order: the `locationId` query parameter (primary — synchronous on first paint), a `postMessage` from the loader (covers a sub-account switch without a reload), then `VITE_DEFAULT_LOCATION_ID` for standalone development. It also reports content height to the parent so the iframe can be sized to fit instead of nesting scrollbars.

None of this is trusted for authorisation. It only says which location to ask about; the backend holds the credentials and decides what may be read.
