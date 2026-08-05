# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Kudos is a classroom star-reward board: Astro 7 (`output: "server"`, Vercel adapter) shell, Svelte 5 islands, UnoCSS `presetWind4`, Bun runtime/test runner, Zod validation.

## Essential Commands

Run everything from the repository root with Bun (`packageManager: bun@1.3.14`).

| Command | Purpose |
| --- | --- |
| `bun install` | Install deps (CI uses `bun install --frozen-lockfile`) |
| `bun run dev` | Astro dev server — the only way to serve this app locally |
| `bun run check` | `astro check` — types across `.astro`, `.svelte`, `.ts`. Currently 0 errors / 5 hints |
| `bun run build` | Production build (the real compile gate) |
| `bun test` | Full suite (44 tests / 11 files, ~50ms) |
| `bun test tests/domain/session.test.ts` | Single file |
| `bun test -t "defaults live sessions to 12 hours"` | Single test by name |
| `bun run lint` / `bun run lint:fix` | `biome check .` / `biome check --write .` |
| `prek run --all-files --stage manual --skip no-commit-to-branch` | The prek hook set, as CI runs it |

Fast loop: `bun test` + `bun run lint`. Full gate before pushing: `bun run lint && bun run check && bun test && bun run build` — this mirrors `.github/workflows/code-quality.yml`.

No env vars are needed for dev or tests; without Redis credentials the app uses the in-memory relay (see `.env.example`).

## Architecture Overview

Two session modes share one domain core:

- **Local mode** (`/`, `/local/session`, `/local/display`) never touches the server. Svelte islands call `src/lib/domain/session.ts` directly and persist to `localStorage`.
- **Live mode** (`/session/[sessionId]/teacher`, `/session/[sessionId]/display`) goes through API routes in `src/pages/api/session/`, which delegate to a relay.

`src/lib/domain/` is the pure core: it imports only from within itself — no Zod, no `node:*`, no relay/server/persistence. Every mutation (`applyStarEvent`, `undoLastEvent`, `endSession`, `resetSession`) returns a **new** `ClassroomSession` with `version + 1`. Both the local islands and both relay implementations call these same functions, so behaviour cannot drift between modes.

`deriveDisplayState(session, expiresAt?)` in `src/lib/domain/session.ts` is the single projection to client-visible state. It resolves display labels, gates `rules`/`goals`/`rewards` on the `show*` preferences, and never carries tokens or the raw event log.

**Relay layer.** `LiveRelay` (`src/lib/relay/types.ts`) is implemented twice — `MemoryRelay` and `RedisRestRelay` (Upstash/Vercel-KV REST, one JSON blob per session at `kudos:live:<id>` with an `EX` TTL). `getRelay()` in `src/lib/server/relay.ts` picks one from `getRedisRestEnv()` and caches it.

**Capabilities.** Teacher and display tokens are separate (`src/lib/relay/auth.ts`). Only a SHA-256 **hash** of the teacher token is stored, verified with `timingSafeEqual`; the display token is stored as-is. `readBearerToken` accepts `authorization: Bearer …` or `x-teacher-token`.

**API routes are thin and uniform**: parse body with a Zod schema → call `getRelay()` → return `{ ok: true, displayState }`, or `normalizeError(error)` with 401 for `UNAUTHORIZED`, 410 for `EXPIRED`, 404 for `NOT_FOUND`/`PURGED`, else 400. Each route declares its own local `json()` helper; there is no shared one.

**Islands.** Only two interactive components exist, each taking `mode: "local" | "live"`: `TeacherControlPanel.svelte` (writes) and `DisplayBoard.svelte` (polls `/api/session/:id/display`, with backoff from `src/lib/liveSessionRetry.ts`). Astro pages are thin wrappers that read `Astro.params` / `?token` and mount one island with `client:load`. Components never import `lib/relay` or `lib/server` — they `fetch` API routes.

## Common Change Workflows

**Add a live-session operation**

1. Add the pure transition to `src/lib/domain/session.ts`.
2. Add the method to the `LiveRelay` interface in `src/lib/relay/types.ts`.
3. Implement it in **both** `memoryRelay.ts` and `redisRelay.ts`.
4. Add a Zod input schema in `src/lib/validation/schemas.ts`.
5. Add the route under `src/pages/api/session/[sessionId]/`, copying the `json()` + `normalizeError` shape of `event.ts`.
6. Wire the call in `TeacherControlPanel.svelte`.
7. Cover it in `tests/domain/` and `tests/api/session-endpoints.test.ts`.

**Change the `ClassTemplate` shape**

1. Edit `src/lib/domain/types.ts`, then `classTemplateSchema` in `src/lib/validation/schemas.ts`.
2. Bump `TEMPLATE_SCHEMA_VERSION` and add the upgrade branch in `src/lib/validation/migrations.ts` — `loadTemplates()` and `parseTemplateJson()` both funnel through `migrateTemplate`, so an un-migrated key silently resets the teacher's stored templates.
3. Update `createDefaultTemplate` in `src/lib/domain/defaults.ts` (a test asserts it satisfies the schema).

**Add a field to `DisplayState`**

Update `src/lib/domain/types.ts`, `deriveDisplayState`, **and** `expiredDisplayState` in `src/lib/relay/displayState.ts` — that placeholder hand-writes every field, so a new required field breaks it.

## Implementation Decisions

| Situation | Preferred approach | Avoid |
| --- | --- | --- |
| Route needs a relay | `getRelay()` from `src/lib/server/relay.ts` | `new RedisRestRelay(...)` — env resolution and caching live in `getRelay()`. Tests do construct relays directly, on purpose |
| Reading Redis credentials | `getRedisRestEnv()` from `src/lib/server/env.ts` | `process.env.KV_REST_API_URL` inline — the helper also accepts the `UPSTASH_REDIS_REST_*` pair |
| Turning an error into a response body | `normalizeError()` from `src/lib/validation/errors.ts` | hand-written JSON — it already maps `ZodError`, `DomainError`, `RelayError` |
| TTL bounds | constants in `src/lib/domain/liveSessionLifecycle.ts` | literal `43200` |
| Import path | relative (`../../lib/domain/session`) | the `@/*` tsconfig alias — it is configured but unused in all 108 imports |
| Rejecting a bad mutation | `throw new DomainError(msg, CODE)` / `RelayError` | returning `null` — routes rely on the thrown type for status codes |

## Repository Conventions

- Biome (`biome.json`) governs formatting: double quotes, semicolons, trailing commas, 100-char lines, 2-space indent. `noUnusedImports` and `noUnusedVariables` are deliberately **off**.
- Commits follow Conventional Commits (enforced by a `commit-msg` prek hook). The `no-commit-to-branch` hook blocks direct commits to `main`, and history is PR merges — branch, then open a PR.
- `pre-push` runs `bun run check` and `bun test`; `pre-commit` runs `bun run lint:fix` plus gitleaks.
- Styling: compose the `k-*` shortcuts from `uno.config.ts` and the CSS custom properties in `src/styles/global.css` (`var(--surface-soft)`, `color-mix(in oklch, …)`). Do not introduce fixed hex colors — dark mode switches via `:root[data-theme="dark"]`.
- Svelte 5 runes only: `$props()`, `$state`, `$derived`. No stores, no `export let`.
- UI language is Danish (`<html lang="da">`). The **only** i18n dictionary is `copy: Record<Language, Copy>` in `SetupWorkspace.svelte`, read via `const t = $derived(copy[language])`. `TeacherControlPanel.svelte`, `DisplayBoard.svelte`, and `PrivacyNotice.astro` carry hardcoded strings and are not wired to it — match the file you are editing rather than half-translating one.

## Testing and Validation

- `bun:test` only; `tests/` mirrors `src/lib/` (`domain/`, `relay/`, `persistence/`, `validation/`, `server/`) plus `tests/api/` and `tests/e2e/`.
- API tests import the route handler and fake the Astro context — no server is booted:

  ```ts
  const context = (request: Request, url: string, params: Record<string, string> = {}) =>
    ({ request, url: new URL(url), params }) as never;
  const response = await eventPost(context(jsonRequest(eventUrl, body, headers), eventUrl, { sessionId }));
  ```

- The relay from `getRelay()` is module-level shared state: call `getMemoryRelayForTests().clear()` in `beforeEach`, and snapshot/restore any `process.env` you mutate in `afterEach` (see `tests/server/env.test.ts`).
- `tests/e2e/kudos-smoke.test.ts` is **not** a browser test — it exercises domain functions against `MemoryRelay`. The real boot check is `.github/workflows/smoke.yml`, which serves `bun run dev` and asserts on page content plus `/api/session/health`.
- No coverage threshold is configured; do not add one incidentally.

## Critical Gotchas

- **`bun run preview` does not work here.** The Vercel adapter refuses the preview command outright. Serve with `bun run dev`; rely on `bun run build` for production-compile confidence. (`.github/workflows/smoke.yml` documents this.)
- **`POST /api/session/create` returns 503 `RELAY_NOT_DURABLE`** when running serverless (`NODE_ENV=production` or `VERCEL`) without Redis credentials, because in-memory sessions die between invocations. Diagnose with `GET /api/session/health`, which reports `relay`/`durable` and the credential env var *name* only. Never widen that payload to include credential values.
- **`MemoryRelay.readRecord()` returns a `structuredClone`.** Mutating the returned record changes nothing until `this.records.set(sessionId, record)`; every mutating method must re-set. `end()` and `purge()` both delete the record, so `/display` legitimately 404s afterwards.
- **The live-session localStorage key is a duplicated literal**: `` `kudos.live.${sessionId}` `` appears in `SetupWorkspace.svelte` and `TeacherControlPanel.svelte`. Change both together. Template/session keys are exported constants in `src/lib/persistence/localTemplateStore.ts` — prefer those.
- **Exports must stay token-free.** `serializeTemplate` re-parses through `classTemplateSchema` so runtime secrets cannot leak into exported JSON; a test asserts the absence of `teacherToken`/`displayToken`. Keep new secret-bearing fields out of `ClassTemplate`.

## Additional Documentation

- `README.md` — read before touching relay configuration or deployment env vars; documents both credential pairs and the memory-fallback failure symptoms.
- `src/docs/live-architecture-freeze.md` — read before changing live-session URLs, tokens, TTL, or the display payload; these contracts are deliberately frozen.
- `.env.example` — read when adding or renaming an environment variable.
- `.github/workflows/code-quality.yml` — read before changing CI, Biome config, or the Renovate flow; the `biome-migrate` job is the only place granted `contents: write`.
- `.github/workflows/smoke.yml` — read before altering routes, `astro dev` startup, or `/api/session/health`; its inline comments explain the daemon and buffering pitfalls.
- `.augment/rules/astro-dev-pro.md` — generic Astro 7 / Bun / UnoCSS / Svelte 5 stack guidance, not repo rules. Consult for unfamiliar framework APIs; where it disagrees with this file, this file wins.
