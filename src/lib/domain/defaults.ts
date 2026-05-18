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

type RulePresetInput = Omit<Rule, "id">;

export const defaultRulePreset: RulePresetInput = {
	label: "Venlige ord og hjælpsomme handlinger",
	description: "Læg mærke til konkret, positiv klasseadfærd.",
	stars: 1,
};

export const behaviorRulePresets: RulePresetInput[] = [
	defaultRulePreset,
	{
		label: "Klar når timen starter",
		description: "Materialer er klar, og opmærksomheden er samlet.",
		stars: 1,
	},
	{
		label: "Hjælper en klassekammerat",
		description: "Giver brugbar hjælp uden at overtage.",
		stars: 1,
	},
	{
		label: "Modig læringsfejl",
		description: "Prøver, forklarer og lærer af feedback.",
		stars: 2,
	},
	{
		label: "Rolig arbejdsro",
		description: "Arbejder roligt og lader andre koncentrere sig.",
		stars: 1,
	},
	{
		label: "Forstyrrer læring",
		description: "En rolig påmindelse, når snak eller uro blokerer andre.",
		stars: -1,
	},
	{
		label: "Utrygt eller uvenligt valg",
		description: "Et tydeligt reset for sikkerhed og respekt.",
		stars: -2,
	},
];

export const createRuleFromPreset = (
	preset: RulePresetInput,
	idGenerator?: IdGenerator,
): Rule => ({
	id: createPrefixedId("rule", idGenerator),
	...preset,
});

export const createDefaultRules = (idGenerator?: IdGenerator): Rule[] => [
	createRuleFromPreset(defaultRulePreset, idGenerator),
];

export const createDefaultGoals = (idGenerator?: IdGenerator): Goal[] => [
	{
		id: createPrefixedId("goal", idGenerator),
		title: "Dagens fokus: godt samarbejde",
		description: "Fejr omsorgsfuldt samarbejde, ikke kun antal stjerner.",
		targetStars: 20,
	},
];

export const createDefaultRewards = (idGenerator?: IdGenerator): Reward[] => [
	{
		id: createPrefixedId("reward", idGenerator),
		title: "Klassens valg af belønning",
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
	className: "Min klasse",
	students: createStarterStudents(idGenerator),
	rules: createDefaultRules(idGenerator),
	goals: createDefaultGoals(idGenerator),
	rewards: createDefaultRewards(idGenerator),
	preferences: { ...defaultPreferences },
	createdAt: now,
	updatedAt: now,
});
