import { describe, expect, test } from "bun:test";
import {
  isTerminalLiveErrorCode,
  liveRetryDecision,
  nextLivePollDelayMs,
  nextLiveRetryDelayMs,
} from "../../src/lib/liveSessionRetry";

describe("live session retry policy", () => {
  test("backs off exponentially and caps retries", () => {
    const policy = { baseDelayMs: 1000, maxDelayMs: 5000 };
    expect(nextLiveRetryDelayMs(1, policy)).toBe(1000);
    expect(nextLiveRetryDelayMs(2, policy)).toBe(2000);
    expect(nextLiveRetryDelayMs(3, policy)).toBe(4000);
    expect(nextLiveRetryDelayMs(4, policy)).toBe(5000);
    expect(nextLiveRetryDelayMs(99, policy)).toBe(5000);
  });

  test("clamps normal polling intervals to the live preference range", () => {
    expect(nextLivePollDelayMs(undefined)).toBe(1200);
    expect(nextLivePollDelayMs(250)).toBe(500);
    expect(nextLivePollDelayMs(1500)).toBe(1500);
    expect(nextLivePollDelayMs(20_000)).toBe(10_000);
  });

  test("classifies terminal live errors as stop decisions", () => {
    for (const code of ["EXPIRED", "NOT_FOUND", "PURGED", "UNAUTHORIZED"]) {
      expect(isTerminalLiveErrorCode(code)).toBe(true);
      expect(liveRetryDecision({ code, failureCount: 3 })).toEqual({
        retry: false,
        reason: "terminal",
        delayMs: null,
        failureCount: 0,
      });
    }
  });

  test("treats missing and non-terminal error codes as retryable", () => {
    expect(
      liveRetryDecision({
        code: "SERVER_ERROR",
        failureCount: 2,
        policy: { baseDelayMs: 1000, maxDelayMs: 5000 },
      }),
    ).toEqual({
      retry: true,
      reason: "transient",
      delayMs: 2000,
      failureCount: 2,
    });
  });
});
