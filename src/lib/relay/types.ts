import type {
	ClassroomSession,
	DisplayState,
	TeacherPreferences,
} from "../domain/types";

export interface LiveSessionRecord {
	id: string;
	session: ClassroomSession;
	teacherTokenHash: string;
	displayToken: string;
	createdAt: string;
	updatedAt: string;
	expiresAt: string;
	ttlSeconds: number;
}

export interface LiveSessionCreated {
	sessionId: string;
	teacherToken: string;
	displayToken: string;
	expiresAt: string;
	displayState: DisplayState;
}

export interface LiveRelay {
	create(
		session: ClassroomSession,
		ttlSeconds: number,
	): Promise<LiveSessionCreated>;
	readDisplay(sessionId: string, displayToken: string): Promise<DisplayState>;
	applyEvent(
		sessionId: string,
		teacherToken: string,
		input: { studentId: string; delta: 1 | -1; reason?: string },
	): Promise<DisplayState>;
	undo(sessionId: string, teacherToken: string): Promise<DisplayState>;
	updateSettings(
		sessionId: string,
		teacherToken: string,
		preferences: Partial<TeacherPreferences>,
	): Promise<DisplayState>;
	end(sessionId: string, teacherToken: string): Promise<DisplayState>;
	purge(sessionId: string, teacherToken: string): Promise<void>;
}

export class RelayError extends Error {
	constructor(
		message: string,
		public readonly code: "NOT_FOUND" | "EXPIRED" | "UNAUTHORIZED" | "PURGED",
	) {
		super(message);
		this.name = "RelayError";
	}
}
