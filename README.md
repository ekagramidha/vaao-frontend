# Frontend — Voice AI Agent Optimizer widget

Vue 3 · Vite · TypeScript · Tailwind v4 · shadcn-style components. Independent of the backend; talks to it only over the documented API.

## Run

```bash
npm install
cp .env.example .env      # VITE_API_BASE_URL
npm run dev               # http://localhost:5173/?locationId=<your-sub-account-id>
```

The sub-account always comes from the `locationId` query parameter, standalone and embedded alike. There is no build-time default: inside HighLevel a fallback would turn a missing merge field from a visible error into silently serving whichever sub-account was compiled in, and having one code path means development cannot drift from what production does.

| Script | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `vue-tsc --build` then `vite build` — types are part of the build, not optional |
| `npm run preview` | Serve the production build locally with Vite |
| `npm run typecheck` | `vue-tsc --noEmit` |

## Layout

```
src/
├── assets/styles/index.css   all theme tokens (see below)
├── components/ui/            base primitives, shadcn-style
├── components/               domain components (IssueCard, RecommendationCard, PromptDiff, …)
├── composables/              useJobRunner — 202 → poll → refresh
├── layouts/AppShell.vue      header, agent switcher, data-source badge
├── views/                    AgentList · AgentWorkspace · TestRun · install success/failure
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

Installed in HighLevel as a **Custom Menu Link** — a native sidebar item pointing at this app, with the sub-account substituted into the URL by a merge field:

```
https://your-optimizer.example.com/?locationId={{ location.id }}
```

`services/embed.ts` reads that on first paint. The merge field is what makes a snippet unnecessary: a frame cannot read its parent's URL — that is a cross-origin `SecurityError` — and `document.referrer` arrives origin-only under the default referrer policy, stripping the path segment holding the id. HighLevel resolving it server-side is the only way the value gets in without injecting script into their page.

A `postMessage` context listener remains as the second source. The menu-link install never uses it, since switching sub-account navigates and reloads the frame; it is the seam a phase-2 Marketplace Custom Page would deliver session context through.

The install success/failure routes are deliberately tiny hash routes. They give the backend somewhere human-readable to redirect after a Marketplace OAuth callback without requiring server rewrite rules from the static frontend host.

There is no third source. If nothing resolves, `AppShell` says so and renders nothing else, rather than firing every request without a location header and producing failures that name the wrong problem.

None of this is trusted for authorisation. It only says which location to ask about; the backend holds the credentials and decides what may be read.
