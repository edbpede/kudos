import { describe, expect, test } from "bun:test";
import { createDefaultTemplate } from "../../src/lib/domain/defaults";
import {
	applyStarEvent,
	createSessionFromTemplate,
	deriveDisplayState,
	undoLastEvent,
} from "../../src/lib/domain/session";
import { MemoryRelay } from "../../src/lib/relay/memoryRelay";

describe("kudos smoke flows", () => {
	test("local setup to teacher/display add remove undo reset shape", () => {
		const template = createDefaultTemplate();
		let session = createSessionFromTemplate(template, "local");
		const studentId = session.students[0].id;
		session = applyStarEvent(session, { studentId, delta: 1 });
		session = applyStarEvent(session, { studentId, delta: -1 });
		session = undoLastEvent(session);
		const display = deriveDisplayState(session);
		expect(display.students[0].total).toBe(1);
		expect(display.rules.length).toBeGreaterThan(0);
	});

	test("live create display poll update purge happy path", async () => {
		const relay = new MemoryRelay();
		const created = await relay.create(
			createSessionFromTemplate(createDefaultTemplate(), "live"),
			3600,
		);
		const studentId = created.displayState.students[0].id;
		expect(
			(await relay.readDisplay(created.sessionId, created.displayToken))
				.students[0].total,
		).toBe(0);
		expect(
			(
				await relay.applyEvent(created.sessionId, created.teacherToken, {
					studentId,
					delta: 1,
				})
			).students[0].total,
		).toBe(1);
		await relay.purge(created.sessionId, created.teacherToken);
		await expect(
			relay.readDisplay(created.sessionId, created.displayToken),
		).rejects.toThrow();
	});
});
