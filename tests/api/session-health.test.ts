import { describe, expect, test } from "bun:test";
import { GET as healthGet } from "../../src/pages/api/session/health";

const context = () => ({}) as never;

describe("session health endpoint", () => {
	test("reports relay backend without leaking secrets", async () => {
		const response = await healthGet(context());
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");

		const body = (await response.json()) as {
			ok: boolean;
			relay: "redis" | "memory";
			redisConfigured: boolean;
			durable: boolean;
			credentialSource: string | null;
		};

		expect(["redis", "memory"]).toContain(body.relay);
		expect(body.durable).toBe(body.relay === "redis");
		expect(body.redisConfigured).toBe(body.relay === "redis");
		expect(body.ok).toBe(body.durable);

		// No credential values are ever exposed — only the env var *name*.
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain(process.env.KV_REST_API_TOKEN ?? "\0");
		expect(serialized).not.toContain(
			process.env.UPSTASH_REDIS_REST_TOKEN ?? "\0",
		);
	});
});
