import { createPrefixedId, type IdGenerator } from "./ids";
import type {
	ClassroomSession,
	ClassTemplate,
	DisplayState,
	StarDelta,
	StarEvent,
	Student,
	StudentDisplayState,
	TotalsByStudent,
} from "./types";

export class DomainError extends Error {
	constructor(
		message: string,
		public readonly code: string,
	) {
		super(message);
		this.name = "DomainError";
	}
}

const clone = <T>(value: T): T => structuredClone(value);

const displayNameCollator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: "base",
});

export const compareStudentsByDisplayName = (a: Student, b: Student) =>
	displayNameCollator.compare(a.displayName, b.displayName) ||
	a.order - b.order ||
	a.id.localeCompare(b.id);

export const alphabetizeStudents = (students: Student[]) =>
	[...students].sort(compareStudentsByDisplayName);

export const createSessionFromTemplate = (
	template: ClassTemplate,
	mode: ClassroomSession["mode"] = "local",
	now = new Date().toISOString(),
	idGenerator?: IdGenerator,
): ClassroomSession => ({
	id: createPrefixedId("session", idGenerator),
	templateId: template.id,
	mode,
	className: template.className,
	students: alphabetizeStudents(clone(template.students)),
	rules: clone(template.rules),
	goals: clone(template.goals),
	rewards: clone(template.rewards),
	preferences: clone(template.preferences),
	events: [],
	status: "active",
	createdAt: now,
	updatedAt: now,
	version: 1,
});

export const deriveTotals = (
	session: Pick<ClassroomSession, "students" | "events">,
): TotalsByStudent => {
	const totals = Object.fromEntries(
		session.students.map((student) => [student.id, 0]),
	);
	for (const event of session.events) {
		totals[event.studentId] = (totals[event.studentId] ?? 0) + event.delta;
	}
	return totals;
};

export interface StarEventInput {
	studentId: string;
	delta: StarDelta;
	reason?: string;
}

export const createBulkStarEventInputs = (
	displayState: Pick<DisplayState, "students">,
	delta: StarDelta,
): StarEventInput[] =>
	// Bulk removal uses displayed totals because DisplayState intentionally omits
	// allowNegativeTotals; this mirrors the teacher UI's existing zero-floor guard.
	displayState.students
		.filter((student) => delta === 1 || student.total > 0)
		.map((student) => ({ studentId: student.id, delta }));

const assertActive = (session: ClassroomSession) => {
	if (session.status !== "active") {
		throw new DomainError("This session is not active.", "SESSION_NOT_ACTIVE");
	}
};

export const applyStarEvent = (
	session: ClassroomSession,
	input: StarEventInput,
	now = new Date().toISOString(),
	idGenerator?: IdGenerator,
): ClassroomSession => {
	assertActive(session);
	const student = session.students.find(
		(candidate) => candidate.id === input.studentId,
	);
	if (!student) {
		throw new DomainError("Student not found.", "STUDENT_NOT_FOUND");
	}

	const totals = deriveTotals(session);
	const nextTotal = (totals[input.studentId] ?? 0) + input.delta;
	if (!session.preferences.allowNegativeTotals && nextTotal < 0) {
		throw new DomainError("Stars cannot go below zero.", "NEGATIVE_TOTAL");
	}

	const event: StarEvent = {
		id: createPrefixedId("event", idGenerator),
		studentId: input.studentId,
		delta: input.delta,
		reason: input.reason?.trim() || undefined,
		actor: "teacher",
		createdAt: now,
	};

	return {
		...session,
		events: [...session.events, event],
		updatedAt: now,
		version: session.version + 1,
	};
};

export const undoLastEvent = (
	session: ClassroomSession,
	now = new Date().toISOString(),
): ClassroomSession => {
	assertActive(session);
	if (session.events.length === 0) {
		throw new DomainError("There is nothing to undo.", "NOTHING_TO_UNDO");
	}

	return {
		...session,
		events: session.events.slice(0, -1),
		updatedAt: now,
		version: session.version + 1,
	};
};

export const resetSession = (
	session: ClassroomSession,
	now = new Date().toISOString(),
): ClassroomSession => ({
	...session,
	events: [],
	status: "reset",
	updatedAt: now,
	version: session.version + 1,
});

export const reactivateSession = (
	session: ClassroomSession,
	now = new Date().toISOString(),
): ClassroomSession => ({
	...session,
	status: "active",
	updatedAt: now,
	version: session.version + 1,
});

export const endSession = (
	session: ClassroomSession,
	now = new Date().toISOString(),
): ClassroomSession => ({
	...session,
	status: "ended",
	endedAt: now,
	updatedAt: now,
	version: session.version + 1,
});

const initialsFor = (student: Student) =>
	student.displayName
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part[0]?.toUpperCase())
		.join("") || "Student";

const displayLabelFor = (
	student: Student,
	mode: ClassroomSession["preferences"]["displayNameMode"],
) => {
	if (mode === "alias") return student.alias || student.displayName;
	if (mode === "initials") return initialsFor(student);
	return student.displayName;
};

export const deriveDisplayState = (
	session: ClassroomSession,
	expiresAt?: string,
): DisplayState => {
	const totals = deriveTotals(session);
	const students: StudentDisplayState[] = alphabetizeStudents(
		session.students,
	).map((student) => {
		const lastPositiveAt = [...session.events]
			.reverse()
			.find(
				(event) => event.studentId === student.id && event.delta > 0,
			)?.createdAt;
		return {
			id: student.id,
			label: displayLabelFor(student, session.preferences.displayNameMode),
			group: student.group,
			total: totals[student.id] ?? 0,
			order: student.order,
			lastPositiveAt,
		};
	});

	return {
		sessionId: session.id,
		className: session.className,
		status: session.status,
		students,
		rules: session.preferences.showRules ? clone(session.rules) : [],
		goals: session.preferences.showGoals ? clone(session.goals) : [],
		rewards: session.preferences.showRewards ? clone(session.rewards) : [],
		preferences: {
			showRules: session.preferences.showRules,
			showGoals: session.preferences.showGoals,
			showRewards: session.preferences.showRewards,
			displayNameMode: session.preferences.displayNameMode,
			reducedMotion: session.preferences.reducedMotion,
			pollIntervalMs: session.preferences.pollIntervalMs,
		},
		version: session.version,
		updatedAt: session.updatedAt,
		expiresAt,
	};
};
