# AGENTS.md

This file provides guidance to AI coding agents when working with code in this
repository.

Kudos is a classroom star-reward board: Astro 7 (`output: "server"` + Vercel adapter) shell,
Svelte 5 islands, UnoCSS `presetWind4`, Bun runtime and test runner, Zod validation.

## Commands

Bun only (`packageManager: bun@1.3.14`), run from the repo root.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Serve locally. `bun run preview` **fails** — the Vercel adapter refuses it |
| `bun run build` | Production compile — the real build gate |
| `bun run check` | `astro check` across `.astro`/`.svelte`/`.ts` (currently 0 errors, 5 hints) |
| `bun test` | Full suite (44 tests / 11 files) |
| `bun test tests/domain/session.test.ts` | Single file |
| `bun test tests/server/env.test.ts -t "defaults live sessions to 12 hours"` | Single test |
| `bun run lint` / `bun run lint:fix` | `biome check .` / `biome check --write .` |
| `SKIP=no-commit-to-branch prek run --all-files --hook-stage manual` | The hook set as CI runs it |

Full gate before pushing, mirroring `.github/workflows/code-quality.yml`:
`bun run lint && bun run check && bun test && bun run build`.

No env vars are needed for dev or tests — without Redis credentials the app uses the in-memory
relay.

## Layering invariants

- `src/lib/domain/` is the pure core and imports only from itself: no Zod, no `node:*`, no
  relay/server/persistence. Validation belongs in `src/lib/validation/`, crypto in
  `src/lib/relay/auth.ts`.
- Svelte components never import `lib/relay` or `lib/server`; they `fetch` the API routes under
  `src/pages/api/session/`.
- Every domain mutation (`applyStarEvent`, `undoLastEvent`, `endSession`, `resetSession`) returns a
  **new** `ClassroomSession` with `version + 1`. Local islands and both relays call these same
  functions, so local and live behaviour cannot drift.
- `deriveDisplayState(session, expiresAt?)` in `src/lib/domain/session.ts` is the only projection to
  client-visible state; it gates `rules`/`goals`/`rewards` on the `show*` preferences and never
  carries tokens or the raw event log.
- Local mode (`/`, `/local/session`, `/local/display`) never touches the server — islands call the
  domain core and persist to `localStorage`. Live mode (`/session/[sessionId]/…`) goes through the
  API routes.
- API routes are thin and uniform: parse with a Zod schema → `getRelay()` → return
  `{ ok: true, displayState }`, else `normalizeError(error)` with 401 `UNAUTHORIZED`, 410 `EXPIRED`,
  404 `NOT_FOUND`/`PURGED`, else 400. Each route declares its own local `json()` helper; there is no
  shared one.

## Changes that must be made in two places

- **New `DisplayState` field** → update `deriveDisplayState` **and** `expiredDisplayState` in
  `src/lib/relay/displayState.ts`, which hand-writes every field.
- **New `LiveRelay` method** → implement in **both** `src/lib/relay/memoryRelay.ts` and
  `src/lib/relay/redisRelay.ts`.
- **`ClassTemplate` shape change** → edit `src/lib/domain/types.ts` and `classTemplateSchema`, bump
  `TEMPLATE_SCHEMA_VERSION`, and add the upgrade branch in `src/lib/validation/migrations.ts`.
  `loadTemplates()` and `parseTemplateJson()` both funnel through `migrateTemplate`, so an
  un-migrated version silently resets the teacher's stored templates. Also update
  `createDefaultTemplate` in `src/lib/domain/defaults.ts` (a test asserts it satisfies the schema).
- **Live-session localStorage key** — `` `kudos.live.${sessionId}` `` is a duplicated literal in
  `SetupWorkspace.svelte:793` and `TeacherControlPanel.svelte:49`. Template and active-session keys
  are exported constants in `src/lib/persistence/localTemplateStore.ts`; prefer those for new keys.
- **UI copy** — the only i18n dictionary is `copy: Record<Language, Copy>` in
  `SetupWorkspace.svelte`, read as `const t = $derived(copy[language])`; a new string needs both a
  `da` and an `en` entry plus a `Copy` field. `TeacherControlPanel.svelte`, `DisplayBoard.svelte`,
  and `PrivacyNotice.astro` carry hardcoded English strings and are not wired to it — match the file
  you are editing rather than half-translating one. Default page language is Danish
  (`<html lang="da">`).

## Preferred call sites

| Need | Use | Not |
| --- | --- | --- |
| A relay in a route | `getRelay()` (`src/lib/server/relay.ts`) | `new RedisRestRelay(...)` — env resolution and caching live in `getRelay()`; tests construct relays directly on purpose |
| Redis credentials | `getRedisRestEnv()` (`src/lib/server/env.ts`) | inline `process.env.KV_REST_API_URL` — the helper also accepts `UPSTASH_REDIS_REST_*` |
| Error → response body | `normalizeError()` (`src/lib/validation/errors.ts`) | hand-written JSON; it already maps `ZodError`, `DomainError`, `RelayError` |
| Rejecting a bad mutation | `throw new DomainError(msg, CODE)` / `RelayError` | returning `null` — routes read the thrown type to pick the status code |
| TTL bounds | constants in `src/lib/domain/liveSessionLifecycle.ts` | literal `43200` |
| Import paths | relative (`../../lib/domain/session`) | the `@/*` tsconfig alias — configured but unused everywhere |
| Colors and surfaces | `k-*` shortcuts from `uno.config.ts` + CSS vars in `src/styles/global.css` | fixed hex values — dark mode switches via `:root[data-theme="dark"]` |
| Svelte reactivity | runes: `$props()`, `$state`, `$derived` | `export let`, `$:`, stores |

## Testing

- `bun:test` only. `tests/` mirrors `src/lib/` (`domain/`, `relay/`, `persistence/`, `validation/`,
  `server/`) plus `tests/api/` and `tests/e2e/`.
- API tests import the route handler and fake the Astro context — no server boots. Copy the
  `context`/`jsonRequest` helpers at the top of `tests/api/session-endpoints.test.ts`.
- `getRelay()` caches module-level shared state: call `getMemoryRelayForTests().clear()` in
  `beforeEach`, and snapshot/restore any `process.env` you mutate in `afterEach` (pattern in
  `tests/server/env.test.ts`).
- `tests/e2e/kudos-smoke.test.ts` is **not** a browser test — it drives domain functions against
  `MemoryRelay`. The real boot check is `.github/workflows/smoke.yml`.
- `RedisRestRelay` tests stub `globalThis.fetch` with a Map-backed Redis; restore `originalFetch`
  afterwards (`tests/relay/redisRelay.test.ts`).
- No coverage threshold is configured; do not add one incidentally.

## Gotchas

- `POST /api/session/create` returns **503 `RELAY_NOT_DURABLE`** when `NODE_ENV=production` or
  `VERCEL` is set without Redis credentials, because in-memory sessions die between invocations.
  Diagnose with `GET /api/session/health`, which reports `relay`/`durable` and the credential env
  var *name* only — never widen that payload to credential values.
- `MemoryRelay.readRecord()` returns a `structuredClone`. Mutating the returned record changes
  nothing until `this.records.set(sessionId, record)`; every mutating method must re-set. `end()`
  and `purge()` delete the record, so `/display` legitimately 404s afterwards.
- Exports must stay token-free: `serializeTemplate` re-parses through `classTemplateSchema` and a
  test asserts `teacherToken`/`displayToken` are absent. Keep secret-bearing fields out of
  `ClassTemplate`.
- Biome's `noUnusedImports` and `noUnusedVariables` are deliberately **off** in `biome.json`.
- A `no-commit-to-branch` prek hook blocks direct commits to `main` — branch and open a PR.
  Commit messages are Conventional Commits, enforced by a `commit-msg` hook.

## Reference

- `README.md` — both Redis credential pairs and the memory-fallback failure symptoms. Read before
  touching relay configuration or deployment env vars.
- `src/docs/live-architecture-freeze.md` — frozen contracts for live-session URLs, tokens, TTL, and
  the display-safe payload. Read before changing any of those.
- `.env.example` — read when adding or renaming an environment variable.
- `.agents/rules/astro-dev-pro.md` — generic Astro 7 / Bun / UnoCSS presetWind4 / Svelte 5 stack
  guidance, not repo rules. Consult for unfamiliar framework APIs; where it disagrees with this
  file, this file wins.
- `.github/workflows/code-quality.yml` — read before changing CI, Biome config, or the Renovate
  flow; the `biome-migrate` job is the only one granted `contents: write`.
- `.github/workflows/smoke.yml` — read before altering routes or `astro dev` startup; its inline
  comments explain the daemon and output-buffering pitfalls.
