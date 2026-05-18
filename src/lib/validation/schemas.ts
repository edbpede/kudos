import { z } from "zod";
import {
	LIVE_SESSION_MAX_TTL_SECONDS,
	LIVE_SESSION_MIN_TTL_SECONDS,
} from "../domain/liveSessionLifecycle";
import { TEMPLATE_SCHEMA_VERSION } from "../domain/types";

const trimmed = z.string().trim();
const idSchema = z.string().min(1);
const isoDateTimeSchema = z.iso.datetime();

export const studentSchema = z.object({
	id: idSchema,
	displayName: trimmed.min(1, "Student display name is required."),
	alias: trimmed.optional(),
	group: trimmed.optional(),
	order: z.number().int().min(0),
});

export const ruleSchema = z.object({
	id: idSchema,
	label: trimmed.min(1, "Rule label is required."),
	description: trimmed.optional(),
	stars: z
		.number()
		.int()
		.min(-10)
		.max(10)
		.refine((value) => value !== 0, "Rule stars cannot be zero."),
});

export const goalSchema = z.object({
	id: idSchema,
	title: trimmed.min(1, "Goal title is required."),
	description: trimmed.optional(),
	targetStars: z.number().int().min(1).max(999).optional(),
});

export const rewardSchema = z.object({
	id: idSchema,
	title: trimmed.min(1, "Reward title is required."),
	costStars: z.number().int().min(1).max(999).optional(),
});

export const preferencesSchema = z.object({
	allowNegativeTotals: z.boolean(),
	enableRightClickRemove: z.boolean(),
	removalRequiresReason: z.boolean(),
	showRules: z.boolean(),
	showGoals: z.boolean(),
	showRewards: z.boolean(),
	displayNameMode: z.enum(["displayName", "alias", "initials"]),
	reducedMotion: z.boolean(),
	pollIntervalMs: z.number().int().min(500).max(10000),
});

export const classTemplateSchema = z.object({
	schemaVersion: z.literal(TEMPLATE_SCHEMA_VERSION),
	id: idSchema,
	className: trimmed.min(1, "Class name is required."),
	students: z.array(studentSchema).min(1, "Add at least one student."),
	rules: z.array(ruleSchema).min(1, "Add at least one classroom rule."),
	goals: z.array(goalSchema),
	rewards: z.array(rewardSchema),
	preferences: preferencesSchema,
	createdAt: isoDateTimeSchema,
	updatedAt: isoDateTimeSchema,
});

export const starEventInputSchema = z.object({
	studentId: idSchema,
	delta: z.union([z.literal(1), z.literal(-1)]),
	reason: trimmed.optional(),
});

export const createLiveSessionSchema = z.object({
	template: classTemplateSchema,
	ttlSeconds: z
		.number()
		.int()
		.min(LIVE_SESSION_MIN_TTL_SECONDS)
		.max(LIVE_SESSION_MAX_TTL_SECONDS)
		.optional(),
});

export const settingsUpdateSchema = z.object({
	preferences: preferencesSchema.partial().optional(),
});

export type ClassTemplateInput = z.infer<typeof classTemplateSchema>;
export type StarEventInput = z.infer<typeof starEventInputSchema>;
