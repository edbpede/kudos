import {
	LIVE_SESSION_DEFAULT_TTL_SECONDS,
	LIVE_SESSION_MAX_TTL_SECONDS,
	LIVE_SESSION_MIN_TTL_SECONDS,
} from "../domain/liveSessionLifecycle";

export const getLiveTtlSeconds = () => {
	const raw = process.env.KUDOS_LIVE_TTL_SECONDS;
	const parsed = raw
		? Number.parseInt(raw, 10)
		: LIVE_SESSION_DEFAULT_TTL_SECONDS;
	return Number.isFinite(parsed)
		? Math.min(
				Math.max(parsed, LIVE_SESSION_MIN_TTL_SECONDS),
				LIVE_SESSION_MAX_TTL_SECONDS,
			)
		: LIVE_SESSION_DEFAULT_TTL_SECONDS;
};

export const getRedisRestEnv = () => {
	const url = process.env.KV_REST_API_URL;
	const token = process.env.KV_REST_API_TOKEN;
	return url && token ? { url, token } : null;
};
