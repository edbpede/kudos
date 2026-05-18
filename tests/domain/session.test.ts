import { describe, expect, test } from "bun:test";
import { createDefaultTemplate } from "../../src/lib/domain/defaults";
import {
	applyStarEvent,
	createSessionFromTemplate,
	deriveDisplayState,
	deriveTotals,
	endSession,
	resetSession,
	undoLastEvent,
} from "../../src/lib/domain/session";

const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
const nextId = () => ids.shift() ?? "z";

describe("session domain", () => {
	test("applies add/remove events and derives totals", () => {
		const template = createDefaultTemplate("2026-01-01T00:00:00.000Z", nextId);
		const studentId = template.students[0].id;
		let session = createSessionFromTemplate(
			template,
			"local",
			"2026-01-01T00:00:00.000Z",
			nextId,
		);

		session = applyStarEvent(
			session,
			{ studentId, delta: 1 },
			"2026-01-01T00:01:00.000Z",
			nextId,
		);
		session = applyStarEvent(
			session,
			{ studentId, delta: -1 },
			"2026-01-01T00:02:00.000Z",
			nextId,
		);

		expect(deriveTotals(session)[studentId]).toBe(0);
		expect(session.version).toBe(3);
	});

	test("rejects removals below zero and undo reverses latest event", () => {
		const template = createDefaultTemplate();
		const studentId = template.students[0].id;
		let session = createSessionFromTemplate(template);

		expect(() => applyStarEvent(session, { studentId, delta: -1 })).toThrow(
			"Stars cannot go below zero",
		);
		session = applyStarEvent(session, { studentId, delta: 1 });
		expect(deriveTotals(session)[studentId]).toBe(1);
		session = undoLastEvent(session);
		expect(deriveTotals(session)[studentId]).toBe(0);
	});

	test("reset/end update status and display projection excludes write secrets", () => {
		const template = createDefaultTemplate();
		let session = createSessionFromTemplate(template);
		session = resetSession(session);
		expect(session.events).toHaveLength(0);
		session = endSession(session);
		const display = deriveDisplayState(session, "2026-01-01T06:00:00.000Z");
		expect(display.status).toBe("ended");
		expect(JSON.stringify(display)).not.toContain("teacher");
		expect(JSON.stringify(display)).not.toContain("secret");
	});
});
