import { describe, expect, test } from "bun:test";
import {
	behaviorRulePresets,
	createDefaultRules,
	createDefaultTemplate,
} from "../../src/lib/domain/defaults";
import { classTemplateSchema } from "../../src/lib/validation/schemas";

describe("default classroom setup", () => {
	test("starts with exactly one default rule", () => {
		expect(createDefaultRules()).toHaveLength(1);
		expect(createDefaultTemplate().rules).toHaveLength(1);
	});

	test("offers positive and negative behavior presets", () => {
		expect(behaviorRulePresets.length).toBeGreaterThanOrEqual(6);
		expect(behaviorRulePresets.some((preset) => preset.stars > 0)).toBe(true);
		expect(behaviorRulePresets.some((preset) => preset.stars < 0)).toBe(true);
	});

	test("template schema accepts selected negative behavior rules", () => {
		const template = createDefaultTemplate();
		template.rules = [
			...template.rules,
			{ id: "rule-negative", label: "Needs a reset", stars: -1 },
		];

		expect(() => classTemplateSchema.parse(template)).not.toThrow();
	});
});
