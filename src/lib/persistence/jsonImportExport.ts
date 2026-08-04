import type { ClassTemplate } from "../domain/types";
import { normalizeError } from "../validation/errors";
import { migrateTemplate } from "../validation/migrations";
import { classTemplateSchema } from "../validation/schemas";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; issues?: string[] };

export const serializeTemplate = (template: ClassTemplate): string => {
  const safeTemplate = classTemplateSchema.parse(template);
  return `${JSON.stringify(safeTemplate, null, 2)}\n`;
};

export const parseTemplateJson = (json: string): ParseResult<ClassTemplate> => {
  try {
    const raw = JSON.parse(json) as unknown;
    return { ok: true, value: migrateTemplate(raw) };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      ok: false,
      message: normalized.message,
      issues: normalized.issues ?? [normalized.message],
    };
  }
};
