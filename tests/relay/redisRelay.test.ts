import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createDefaultTemplate } from "../../src/lib/domain/defaults";
import { createSessionFromTemplate } from "../../src/lib/domain/session";
import { RedisRestRelay } from "../../src/lib/relay/redisRelay";

const originalFetch = globalThis.fetch;
const totalFor = (
	display: { students: { id: string; total: number }[] },
	studentId: string,
) => display.students.find((student) => student.id === studentId)?.total;

describe("RedisRestRelay", () => {
	const store = new Map<string, string>();
	const commands: string[][] = [];

	beforeEach(() => {
		store.clear();
		commands.length = 0;
		globalThis.fetch = (async (
			_input: RequestInfo | URL,
			init?: RequestInit,
		) => {
			const command = JSON.parse(String(init?.body)) as string[];
			commands.push(command);
			const [op, key, value] = command;
			if (op === "SET") {
				store.set(key, value);
				return Response.json({ result: "OK" });
			}
			if (op === "GET") {
				return Response.json({ result: store.get(key) ?? null });
			}
			if (op === "DEL") {
				const existed = store.delete(key);
				return Response.json({ result: existed ? 1 : 0 });
			}
			return Response.json({ error: `unsupported ${op}` }, { status: 400 });
		}) as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test("creates records with EX ttl and preserves remaining ttl on mutation", async () => {
		const relay = new RedisRestRelay({
			url: "https://redis.example",
			token: "test",
		});
		const created = await relay.create(
			createSessionFromTemplate(createDefaultTemplate(), "live"),
			3600,
		);
		expect(commands[0]).toEqual([
			"SET",
			`kudos:live:${created.sessionId}`,
			expect.any(String),
			"EX",
			"3600",
		]);

		const studentId = created.displayState.students[0].id;
		const display = await relay.applyEvent(
			created.sessionId,
			created.teacherToken,
			{ studentId, delta: 1 },
		);
		expect(totalFor(display, studentId)).toBe(1);
		const lastSet = commands.filter((command) => command[0] === "SET").at(-1);
		expect(lastSet?.[3]).toBe("EX");
		expect(Number(lastSet?.[4])).toBeGreaterThan(0);
		expect(JSON.stringify(display)).not.toContain(created.teacherToken);
	});

	test("purges with DEL after teacher authorization", async () => {
		const relay = new RedisRestRelay({
			url: "https://redis.example",
			token: "test",
		});
		const created = await relay.create(
			createSessionFromTemplate(createDefaultTemplate(), "live"),
			3600,
		);
		await relay.purge(created.sessionId, created.teacherToken);
		expect(commands.at(-1)).toEqual(["DEL", `kudos:live:${created.sessionId}`]);
	});

	test("ending returns ended state and deletes the record", async () => {
		const relay = new RedisRestRelay({
			url: "https://redis.example",
			token: "test",
		});
		const created = await relay.create(
			createSessionFromTemplate(createDefaultTemplate(), "live"),
			3600,
		);
		const ended = await relay.end(created.sessionId, created.teacherToken);
		expect(ended.status).toBe("ended");
		expect(commands.at(-1)).toEqual(["DEL", `kudos:live:${created.sessionId}`]);
		let rejected: unknown;
		try {
			await relay.readDisplay(created.sessionId, created.displayToken);
		} catch (error) {
			rejected = error;
		}
		expect(rejected).toBeInstanceOf(Error);
		expect((rejected as Error).message).toContain("no longer available");
	});

	test("expired records are deleted and rejected", async () => {
		const relay = new RedisRestRelay({
			url: "https://redis.example",
			token: "test",
		});
		const created = await relay.create(
			createSessionFromTemplate(createDefaultTemplate(), "live"),
			3600,
		);
		const key = `kudos:live:${created.sessionId}`;
		const record = JSON.parse(store.get(key) ?? "{}") as { expiresAt: string };
		store.set(
			key,
			JSON.stringify({ ...record, expiresAt: "2000-01-01T00:00:00.000Z" }),
		);

		expect(
			relay.readDisplay(created.sessionId, created.displayToken),
		).rejects.toThrow("expired");
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(commands.at(-1)).toEqual(["DEL", key]);
	});
});
