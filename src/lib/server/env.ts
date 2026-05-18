export const getLiveTtlSeconds = () => {
	const raw = process.env.KUDOS_LIVE_TTL_SECONDS;
	const parsed = raw ? Number.parseInt(raw, 10) : 21_600;
	return Number.isFinite(parsed)
		? Math.min(Math.max(parsed, 60), 86_400)
		: 21_600;
};

export const getRedisRestEnv = () => {
	const url = process.env.KV_REST_API_URL;
	const token = process.env.KV_REST_API_TOKEN;
	return url && token ? { url, token } : null;
};
