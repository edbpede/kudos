import { MemoryRelay } from "../relay/memoryRelay";
import { RedisRestRelay } from "../relay/redisRelay";
import type { LiveRelay } from "../relay/types";
import { getRedisRestEnv } from "./env";

const memoryRelay = new MemoryRelay();
let cachedRelay: LiveRelay | undefined;
let cachedRelayKind: "redis" | "memory" = "memory";
let cachedRedisSource: string | undefined;

const isServerlessRuntime = () =>
  process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

let warnedMemoryFallback = false;
const warnMemoryFallbackOnce = () => {
  if (warnedMemoryFallback || !isServerlessRuntime()) return;
  warnedMemoryFallback = true;
  console.warn(
    "[kudos] Live relay fell back to the in-memory store: no Redis REST " +
      "credentials were found (checked KV_REST_API_URL/KV_REST_API_TOKEN and " +
      "UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN). In a serverless " +
      "deployment this loses live sessions between invocations, causing 404 " +
      "NOT_FOUND on /display and 400 on /event. Provision a Redis/Upstash REST " +
      "store and set the credentials to keep live sessions alive.",
  );
};

export const getRelay = (): LiveRelay => {
  if (cachedRelay) return cachedRelay;
  const redis = getRedisRestEnv();
  if (redis) {
    cachedRelay = new RedisRestRelay(redis);
    cachedRelayKind = "redis";
    cachedRedisSource = redis.source;
  } else {
    cachedRelay = memoryRelay;
    cachedRelayKind = "memory";
    cachedRedisSource = undefined;
    warnMemoryFallbackOnce();
  }
  return cachedRelay;
};

/** Non-secret diagnostics about which relay backend is active. */
export const getRelayDiagnostics = () => {
  getRelay();
  return {
    relay: cachedRelayKind,
    redisConfigured: cachedRelayKind === "redis",
    credentialSource: cachedRedisSource ?? null,
    durable: cachedRelayKind === "redis",
    serverless: isServerlessRuntime(),
  };
};

export const getMemoryRelayForTests = () => memoryRelay;
