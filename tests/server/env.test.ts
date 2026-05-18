import { afterEach, describe, expect, test } from "bun:test";
import { getLiveTtlSeconds } from "../../src/lib/server/env";

const originalLiveTtl = process.env.KUDOS_LIVE_TTL_SECONDS;

describe("server env", () => {
	afterEach(() => {
		if (originalLiveTtl === undefined)
			delete process.env.KUDOS_LIVE_TTL_SECONDS;
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
