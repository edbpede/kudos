import { expect, test } from "bun:test";
import { createDefaultTemplate } from "../../src/lib/domain/defaults";
import { classTemplateSchema } from "../../src/lib/validation/schemas";

test("default template satisfies shared schema", () => {
	expect(() =>
		classTemplateSchema.parse(createDefaultTemplate()),
	).not.toThrow();
});
