# Live Architecture Freeze

Before provider-specific relay code, Kudos freezes the live-session contract:

- **Actions vs endpoints:** local setup and local sessions are client-side/local-first. Live session create/read/mutate/undo/settings/end are API endpoints because display devices consume stable resource URLs and teacher writes need capability-token checks.
- **Output mode:** Astro uses `output: "server"` with the official Vercel adapter so live endpoints are on demand.
- **Capabilities:** teacher write token and display read token are generated separately. The server stores a teacher token hash and never serializes the teacher token to display routes, display payloads, logs, exports, or local display state.
- **TTL:** live records have `expiresAt` and provider TTL. Default TTL is six hours unless `KUDOS_LIVE_TTL_SECONDS` overrides it.
- **Display-safe payload:** display responses include class/session title, students, totals, preferences, goals/rules/rewards, status, version, and timestamps only.
- **Errors:** expired, purged, missing, invalid, and unauthorized requests return friendly structured JSON without roster data for expired/purged sessions.
