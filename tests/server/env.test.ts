import { afterEach, describe, expect, test } from "bun:test";
import { getLiveTtlSeconds, getRedisRestEnv } from "../../src/lib/server/env";

const originalLiveTtl = process.env.KUDOS_LIVE_TTL_SECONDS;

const REDIS_ENV_KEYS = [
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;
const originalRedisEnv = Object.fromEntries(REDIS_ENV_KEYS.map((key) => [key, process.env[key]]));
const restoreRedisEnv = () => {
  for (const key of REDIS_ENV_KEYS) {
    const value = originalRedisEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

describe("server env", () => {
  afterEach(() => {
    if (originalLiveTtl === undefined) delete process.env.KUDOS_LIVE_TTL_SECONDS;
    else process.env.KUDOS_LIVE_TTL_SECONDS = originalLiveTtl;
  });

  test("defaults live sessions to 12 hours", () => {
    delete process.env.KUDOS_LIVE_TTL_SECONDS;
    expect(getLiveTtlSeconds()).toBe(43_200);
  });

  test("clamps live session ttl overrides to the 12 hour destruction window", () => {
    process.env.KUDOS_LIVE_TTL_SECONDS = "30";
    expect(getLiveTtlSeconds()).toBe(60);

    process.env.KUDOS_LIVE_TTL_SECONDS = "100000";
    expect(getLiveTtlSeconds()).toBe(43_200);

    process.env.KUDOS_LIVE_TTL_SECONDS = "not-a-number";
    expect(getLiveTtlSeconds()).toBe(43_200);
  });
});

describe("getRedisRestEnv", () => {
  afterEach(restoreRedisEnv);

  test("returns null when no credential pair is fully set", () => {
    for (const key of REDIS_ENV_KEYS) delete process.env[key];
    expect(getRedisRestEnv()).toBeNull();

    // A url without its token must not count as configured.
    process.env.KV_REST_API_URL = "https://kv.example";
    expect(getRedisRestEnv()).toBeNull();
  });

  test("reads legacy Vercel KV credentials", () => {
    for (const key of REDIS_ENV_KEYS) delete process.env[key];
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "kv-token";
    expect(getRedisRestEnv()).toEqual({
      url: "https://kv.example",
      token: "kv-token",
      source: "KV_REST_API_URL",
    });
  });

  test("falls back to Vercel Marketplace Upstash credentials", () => {
    for (const key of REDIS_ENV_KEYS) delete process.env[key];
    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "upstash-token";
    expect(getRedisRestEnv()).toEqual({
      url: "https://upstash.example",
      token: "upstash-token",
      source: "UPSTASH_REDIS_REST_URL",
    });
  });

  test("prefers legacy KV names over Upstash when both are present", () => {
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "kv-token";
    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "upstash-token";
    expect(getRedisRestEnv()?.source).toBe("KV_REST_API_URL");
  });

  test("trims surrounding whitespace from credentials", () => {
    for (const key of REDIS_ENV_KEYS) delete process.env[key];
    process.env.UPSTASH_REDIS_REST_URL = "  https://upstash.example  ";
    process.env.UPSTASH_REDIS_REST_TOKEN = "  upstash-token  ";
    expect(getRedisRestEnv()).toEqual({
      url: "https://upstash.example",
      token: "upstash-token",
      source: "UPSTASH_REDIS_REST_URL",
    });
  });
});
