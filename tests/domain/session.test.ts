import { describe, expect, test } from "bun:test";
import { createDefaultTemplate } from "../../src/lib/domain/defaults";
import {
  alphabetizeStudents,
  applyStarEvent,
  createBulkStarEventInputs,
  createSessionFromTemplate,
  deriveDisplayState,
  deriveTotals,
  endSession,
  resetSession,
  undoLastEvent,
} from "../../src/lib/domain/session";
import type { Student } from "../../src/lib/domain/types";

const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
const nextId = () => ids.shift() ?? "z";

const studentNamed = (
  displayName: string,
  order: number,
  id = displayName.toLowerCase().replace(/\s+/g, "-"),
): Student => ({
  id: `student-${id}`,
  displayName,
  order,
});

const orderedNames = (students: Pick<Student, "displayName">[]) =>
  students.map((student) => student.displayName);

describe("session domain", () => {
  test("alphabetizes students by display name with order and id tie-breakers", () => {
    const students = [
      studentNamed("Student 10", 0, "ten"),
      studentNamed("bailey", 0, "bailey-lower"),
      studentNamed("Alex", 3, "alex-late"),
      studentNamed("alex", 1, "alex-early"),
      studentNamed("Student 2", 0, "two"),
      studentNamed("Bailey", 0, "bailey-upper"),
    ];

    expect(orderedNames(alphabetizeStudents(students))).toEqual([
      "alex",
      "Alex",
      "bailey",
      "Bailey",
      "Student 2",
      "Student 10",
    ]);
  });

  test("creates sessions with alphabetized students even when order conflicts", () => {
    const template = createDefaultTemplate();
    template.students = [
      studentNamed("Zoey", 0, "zoey"),
      studentNamed("Alex", 9, "alex"),
      studentNamed("Mina", 1, "mina"),
    ];

    const session = createSessionFromTemplate(template);

    expect(orderedNames(session.students)).toEqual(["Alex", "Mina", "Zoey"]);
  });

  test("derives display state with alphabetized students regardless of session order", () => {
    const template = createDefaultTemplate();
    template.students = [
      studentNamed("Student 10", 0, "ten"),
      studentNamed("casey", 0, "casey-lower"),
      studentNamed("Student 2", 1, "two"),
      studentNamed("Bailey", 9, "bailey"),
    ];
    const session = {
      ...createSessionFromTemplate(template),
      students: [...template.students].reverse(),
    };

    const display = deriveDisplayState(session);

    expect(display.students.map((student) => student.label)).toEqual([
      "Bailey",
      "casey",
      "Student 2",
      "Student 10",
    ]);
  });
  test("applies add/remove events and derives totals", () => {
    const template = createDefaultTemplate("2026-01-01T00:00:00.000Z", nextId);
    const studentId = template.students[0].id;
    let session = createSessionFromTemplate(template, "local", "2026-01-01T00:00:00.000Z", nextId);

    session = applyStarEvent(session, { studentId, delta: 1 }, "2026-01-01T00:01:00.000Z", nextId);
    session = applyStarEvent(session, { studentId, delta: -1 }, "2026-01-01T00:02:00.000Z", nextId);

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

  test("creates bulk star inputs for all adds and positive-only removals", () => {
    const template = createDefaultTemplate();
    let session = createSessionFromTemplate(template);
    const [first, second] = session.students;
    session = applyStarEvent(session, { studentId: first.id, delta: 1 });
    session = applyStarEvent(session, { studentId: first.id, delta: 1 });
    session = applyStarEvent(session, { studentId: second.id, delta: 1 });
    const display = deriveDisplayState(session);

    expect(createBulkStarEventInputs(display, 1)).toEqual(
      display.students.map((student) => ({ studentId: student.id, delta: 1 })),
    );
    expect(createBulkStarEventInputs(display, -1)).toEqual(
      display.students
        .filter((student) => student.total > 0)
        .map((student) => ({ studentId: student.id, delta: -1 })),
    );
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
