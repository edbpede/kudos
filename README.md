# Kudos

Kudos is a privacy-first classroom reward board built with Astro, Bun, UnoCSS Wind4, and Svelte 5 islands.

## Development

```bash
bun install
bun run dev
bun run check
bun run build
bun run test
```

## Privacy model

- Class templates are stored locally in the teacher browser by default.
- Exported JSON is versioned template data only; it does not include live teacher secrets or runtime tokens.
- Live sessions use temporary relay state with a 12-hour maximum TTL and manual purge.
- Display URLs use a read-only display token. Mutating endpoints require a separate teacher token.

## Live relay environment

Production live mode expects a Vercel-compatible Redis/Upstash REST provider:

```bash
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
KUDOS_LIVE_TTL_SECONDS="43200"
```

When these variables are absent, development and tests use an in-memory relay. That fallback is not durable across serverless invocations and is intentionally documented as local-only.
Live TTL overrides are clamped to a maximum of 12 hours so stale live-session records self-destruct.

## Architecture freeze for live mode

- Local setup/session interactions run in Svelte islands against browser local storage and framework-independent domain services.
- Live session resource URLs use API endpoints because display polling, capability-token writes, purge, and expiry are URL contracts consumed outside Astro form actions.
- `output: "server"` with the official Vercel adapter keeps endpoints on demand.
- Teacher tokens and display tokens are distinct. Server records store only a hash of the teacher token; display responses include only display-safe state.
- Relay semantics: create, display read, teacher event mutation, undo, settings update, end/purge, TTL expiry.
