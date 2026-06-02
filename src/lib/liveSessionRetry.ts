export const LIVE_DEFAULT_POLL_INTERVAL_MS = 1200;
export const LIVE_RETRY_BASE_DELAY_MS = 1500;
export const LIVE_RETRY_MAX_DELAY_MS = 30_000;

const TERMINAL_LIVE_ERROR_CODES = new Set([
	"EXPIRED",
	"NOT_FOUND",
	"PURGED",
	"UNAUTHORIZED",
]);

export interface LiveRetryPolicy {
	baseDelayMs?: number;
	maxDelayMs?: number;
}

export const isTerminalLiveErrorCode = (code: unknown) =>
	typeof code === "string" && TERMINAL_LIVE_ERROR_CODES.has(code);

export const nextLivePollDelayMs = (
	pollIntervalMs: number | null | undefined,
) => {
	if (typeof pollIntervalMs !== "number" || !Number.isFinite(pollIntervalMs))
		return LIVE_DEFAULT_POLL_INTERVAL_MS;
	return Math.min(10_000, Math.max(500, Math.round(pollIntervalMs)));
};

export const nextLiveRetryDelayMs = (
	failureCount: number,
	policy: LiveRetryPolicy = {},
) => {
	const attempts = Math.max(1, Math.floor(failureCount));
	const baseDelayMs = Math.max(
		1,
		Math.round(policy.baseDelayMs ?? LIVE_RETRY_BASE_DELAY_MS),
	);
	const maxDelayMs = Math.max(
		baseDelayMs,
		Math.round(policy.maxDelayMs ?? LIVE_RETRY_MAX_DELAY_MS),
	);
	return Math.min(maxDelayMs, baseDelayMs * 2 ** (attempts - 1));
};

export const liveRetryDecision = ({
	code,
	failureCount,
	policy,
}: {
	code?: unknown;
	failureCount: number;
	policy?: LiveRetryPolicy;
}) => {
	if (isTerminalLiveErrorCode(code)) {
		return {
			retry: false as const,
			reason: "terminal" as const,
			delayMs: null,
			failureCount: 0,
		};
	}
	const nextFailureCount = Math.max(1, Math.floor(failureCount));
	return {
		retry: true as const,
		reason: "transient" as const,
		delayMs: nextLiveRetryDelayMs(nextFailureCount, policy),
		failureCount: nextFailureCount,
	};
};
