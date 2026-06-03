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

Production live mode requires a Redis/Upstash REST provider. Either credential
pair is accepted (checked in this order):

```bash
# 1. Legacy Vercel KV names
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."

# 2. Vercel Marketplace Upstash names (Vercel KV is no longer offered for new projects)
UPSTASH_REDIS_REST_URL="https://...upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."

KUDOS_LIVE_TTL_SECONDS="43200"
```

When none of these variables are present, development and tests use an in-memory
relay. **That fallback is not durable across serverless invocations** — on Vercel
each request can hit a different Lambda instance, so live sessions disappear and
clients see `404` on `/display` and `400` on `/event` ("This live session is no
longer available"). The credentials must be set in the deployment environment,
not only in `.env`.

Verify which backend production is using by requesting `/api/session/health`. It
returns `{"relay":"redis","durable":true,...}` when a durable store is active, or
`{"relay":"memory","durable":false,...}` when the in-memory fallback is in effect.
No secrets or session data are exposed.

Live TTL overrides are clamped to a maximum of 12 hours so stale live-session records self-destruct.

## Architecture freeze for live mode

- Local setup/session interactions run in Svelte islands against browser local storage and framework-independent domain services.
- Live session resource URLs use API endpoints because display polling, capability-token writes, purge, and expiry are URL contracts consumed outside Astro form actions.
- `output: "server"` with the official Vercel adapter keeps endpoints on demand.
- Teacher tokens and display tokens are distinct. Server records store only a hash of the teacher token; display responses include only display-safe state.
- Relay semantics: create, display read, teacher event mutation, undo, settings update, end/purge, TTL expiry.
