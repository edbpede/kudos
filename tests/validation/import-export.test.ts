import { describe, expect, test } from "bun:test";
import { createDefaultTemplate } from "../../src/lib/domain/defaults";
import { parseTemplateJson, serializeTemplate } from "../../src/lib/persistence/jsonImportExport";

describe("template import/export", () => {
  test("round trips versioned template JSON without runtime secrets", () => {
    const template = createDefaultTemplate();
    const json = serializeTemplate(template);
    expect(json).toContain('"schemaVersion": 1');
    expect(json).not.toContain("teacherToken");
    expect(json).not.toContain("displayToken");

    const parsed = parseTemplateJson(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.className).toBe(template.className);
  });

  test("invalid JSON returns recoverable user-readable error", () => {
    const parsed = parseTemplateJson("not-json");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message.length).toBeGreaterThan(0);
  });

  test("unsupported versions are rejected", () => {
    const template = createDefaultTemplate();
    const parsed = parseTemplateJson(JSON.stringify({ ...template, schemaVersion: 99 }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok)
      expect(parsed.issues?.join(" ")).toContain("Unsupported template schema version");
  });
});
