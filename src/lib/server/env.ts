import {
  LIVE_SESSION_DEFAULT_TTL_SECONDS,
  LIVE_SESSION_MAX_TTL_SECONDS,
  LIVE_SESSION_MIN_TTL_SECONDS,
} from "../domain/liveSessionLifecycle";

export const getLiveTtlSeconds = () => {
  const raw = process.env.KUDOS_LIVE_TTL_SECONDS;
  const parsed = raw ? Number.parseInt(raw, 10) : LIVE_SESSION_DEFAULT_TTL_SECONDS;
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, LIVE_SESSION_MIN_TTL_SECONDS), LIVE_SESSION_MAX_TTL_SECONDS)
    : LIVE_SESSION_DEFAULT_TTL_SECONDS;
};

export interface RedisRestEnv {
  url: string;
  token: string;
  /** Name of the env var pair that supplied the credentials (no secrets). */
  source: string;
}

/**
 * Env var name pairs that can supply Redis REST credentials, in priority order.
 *
 * `KV_REST_API_*` are the legacy Vercel KV names. Vercel KV is no longer offered
 * for new projects, so production stores are now provisioned through the Vercel
 * Marketplace (Upstash), which exposes `UPSTASH_REDIS_REST_*`. We accept both so
 * a Marketplace-provisioned store is picked up without manual env aliasing —
 * missing this is what silently drops live sessions onto the in-memory fallback.
 */
const REDIS_ENV_CANDIDATES: ReadonlyArray<{ url: string; token: string }> = [
  { url: "KV_REST_API_URL", token: "KV_REST_API_TOKEN" },
  { url: "UPSTASH_REDIS_REST_URL", token: "UPSTASH_REDIS_REST_TOKEN" },
];

export const getRedisRestEnv = (): RedisRestEnv | null => {
  for (const candidate of REDIS_ENV_CANDIDATES) {
    const url = process.env[candidate.url]?.trim();
    const token = process.env[candidate.token]?.trim();
    if (url && token) return { url, token, source: candidate.url };
  }
  return null;
};
