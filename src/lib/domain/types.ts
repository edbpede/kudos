export const TEMPLATE_SCHEMA_VERSION = 1;

export type Id = string;

export interface Student {
	id: Id;
	displayName: string;
	alias?: string;
	group?: string;
	order: number;
}

export interface Rule {
	id: Id;
	label: string;
	description?: string;
	stars: number;
}

export interface Goal {
	id: Id;
	title: string;
	description?: string;
	targetStars?: number;
}

export interface Reward {
	id: Id;
	title: string;
	costStars?: number;
}

export type DisplayNameMode = "displayName" | "alias" | "initials";

export interface TeacherPreferences {
	allowNegativeTotals: boolean;
	enableRightClickRemove: boolean;
	removalRequiresReason: boolean;
	showRules: boolean;
	showGoals: boolean;
	showRewards: boolean;
	displayNameMode: DisplayNameMode;
	reducedMotion: boolean;
	pollIntervalMs: number;
}

export interface ClassTemplate {
	schemaVersion: typeof TEMPLATE_SCHEMA_VERSION;
	id: Id;
	className: string;
	students: Student[];
	rules: Rule[];
	goals: Goal[];
	rewards: Reward[];
	preferences: TeacherPreferences;
	createdAt: string;
	updatedAt: string;
}

export type SessionMode = "local" | "live";
export type SessionStatus = "active" | "ended" | "reset";
export type StarDelta = 1 | -1;

export interface StarEvent {
	id: Id;
	studentId: Id;
	delta: StarDelta;
	reason?: string;
	createdAt: string;
	actor: "teacher";
}

export interface ClassroomSession {
	id: Id;
	templateId: Id;
	mode: SessionMode;
	className: string;
	students: Student[];
	rules: Rule[];
	goals: Goal[];
	rewards: Reward[];
	preferences: TeacherPreferences;
	events: StarEvent[];
	status: SessionStatus;
	createdAt: string;
	updatedAt: string;
	endedAt?: string;
	version: number;
}

export interface StudentDisplayState {
	id: Id;
	label: string;
	group?: string;
	total: number;
	order: number;
	lastPositiveAt?: string;
}

export interface DisplayState {
	sessionId: Id;
	className: string;
	status: SessionStatus | "expired" | "purged";
	students: StudentDisplayState[];
	rules: Rule[];
	goals: Goal[];
	rewards: Reward[];
	preferences: Pick<
		TeacherPreferences,
		| "showRules"
		| "showGoals"
		| "showRewards"
		| "displayNameMode"
		| "reducedMotion"
		| "pollIntervalMs"
	>;
	version: number;
	updatedAt: string;
	expiresAt?: string;
}

export interface TotalsByStudent {
	[studentId: string]: number;
}
