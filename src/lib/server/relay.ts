import { MemoryRelay } from "../relay/memoryRelay";
import { RedisRestRelay } from "../relay/redisRelay";
import type { LiveRelay } from "../relay/types";
import { getRedisRestEnv } from "./env";

const memoryRelay = new MemoryRelay();
let cachedRelay: LiveRelay | undefined;

export const getRelay = (): LiveRelay => {
	if (cachedRelay) return cachedRelay;
	const redis = getRedisRestEnv();
	cachedRelay = redis ? new RedisRestRelay(redis) : memoryRelay;
	return cachedRelay;
};

export const getMemoryRelayForTests = () => memoryRelay;
