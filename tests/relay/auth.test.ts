import { describe, expect, test } from "bun:test";
import { createDefaultTemplate } from "../../src/lib/domain/defaults";
import { createSessionFromTemplate } from "../../src/lib/domain/session";
import { MemoryRelay } from "../../src/lib/relay/memoryRelay";

describe("live relay", () => {
	test("separates teacher and display capabilities", async () => {
		const relay = new MemoryRelay();
		const session = createSessionFromTemplate(createDefaultTemplate(), "live");
		const created = await relay.create(session, 3600);
		const studentId = created.displayState.students[0].id;

		await expect(
			relay.applyEvent(created.sessionId, created.displayToken, {
				studentId,
				delta: 1,
			}),
		).rejects.toThrow("Teacher authorization is required");
		const display = await relay.applyEvent(
			created.sessionId,
			created.teacherToken,
			{ studentId, delta: 1 },
		);
		expect(display.students[0].total).toBe(1);
		expect(JSON.stringify(display)).not.toContain(created.teacherToken);
	});

	test("purge removes remote roster state", async () => {
		const relay = new MemoryRelay();
		const created = await relay.create(
			createSessionFromTemplate(createDefaultTemplate(), "live"),
			3600,
		);
		await relay.purge(created.sessionId, created.teacherToken);
		await expect(
			relay.readDisplay(created.sessionId, created.displayToken),
		).rejects.toThrow("no longer available");
	});

	test("expiry rejects reads", async () => {
		const relay = new MemoryRelay();
		const created = await relay.create(
			createSessionFromTemplate(createDefaultTemplate(), "live"),
			3600,
		);
		const records = (
			relay as unknown as { records: Map<string, { expiresAt: string }> }
		).records;
		const record = records.get(created.sessionId);
		if (record) record.expiresAt = "2000-01-01T00:00:00.000Z";
		await expect(
			relay.readDisplay(created.sessionId, created.displayToken),
		).rejects.toThrow("expired");
	});
});
