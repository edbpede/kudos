import { defaultPreferences } from "../domain/defaults";
import type { ClassTemplate } from "../domain/types";
import { TEMPLATE_SCHEMA_VERSION } from "../domain/types";
import { classTemplateSchema } from "./schemas";

export const migrateTemplate = (raw: unknown): ClassTemplate => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Import must be a JSON object.");
  }

  const candidate = raw as Record<string, unknown>;
  const version = candidate.schemaVersion;

  if (version === TEMPLATE_SCHEMA_VERSION) {
    return classTemplateSchema.parse(candidate);
  }

  if (version === undefined || version === 0) {
    const now = new Date().toISOString();
    return classTemplateSchema.parse({
      ...candidate,
      schemaVersion: TEMPLATE_SCHEMA_VERSION,
      preferences: {
        ...defaultPreferences,
        ...((candidate.preferences as object | undefined) ?? {}),
      },
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt: now,
    });
  }

  throw new Error(`Unsupported template schema version: ${String(version)}.`);
};
