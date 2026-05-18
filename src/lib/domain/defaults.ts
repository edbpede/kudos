import { createPrefixedId, type IdGenerator } from "./ids";
import {
	type ClassTemplate,
	type Goal,
	type Reward,
	type Rule,
	type Student,
	TEMPLATE_SCHEMA_VERSION,
	type TeacherPreferences,
} from "./types";

export const defaultPreferences: TeacherPreferences = {
	allowNegativeTotals: false,
	enableRightClickRemove: false,
	removalRequiresReason: false,
	showRules: true,
	showGoals: true,
	showRewards: true,
	displayNameMode: "displayName",
	reducedMotion: false,
	pollIntervalMs: 1200,
};

export const createDefaultRules = (idGenerator?: IdGenerator): Rule[] => [
	{
		id: createPrefixedId("rule", idGenerator),
		label: "Kind words and helpful actions",
		description: "Notice specific, positive classroom behavior.",
		stars: 1,
	},
];

export const createDefaultGoals = (idGenerator?: IdGenerator): Goal[] => [
	{
		id: createPrefixedId("goal", idGenerator),
		title: "Today’s focus: quality teamwork",
		description: "Celebrate thoughtful collaboration, not just quantity.",
		targetStars: 20,
	},
];

export const createDefaultRewards = (idGenerator?: IdGenerator): Reward[] => [
	{
		id: createPrefixedId("reward", idGenerator),
		title: "Class celebration choice",
		costStars: 30,
	},
];

export const createStarterStudents = (idGenerator?: IdGenerator): Student[] =>
	["Alex", "Bailey", "Casey", "Drew"].map((displayName, order) => ({
		id: createPrefixedId("student", idGenerator),
		displayName,
		order,
	}));

export const createDefaultTemplate = (
	now = new Date().toISOString(),
	idGenerator?: IdGenerator,
): ClassTemplate => ({
	schemaVersion: TEMPLATE_SCHEMA_VERSION,
	id: createPrefixedId("class", idGenerator),
	className: "My class",
	students: createStarterStudents(idGenerator),
	rules: createDefaultRules(idGenerator),
	goals: createDefaultGoals(idGenerator),
	rewards: createDefaultRewards(idGenerator),
	preferences: { ...defaultPreferences },
	createdAt: now,
	updatedAt: now,
});
