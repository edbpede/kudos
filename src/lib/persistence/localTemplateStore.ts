import { createDefaultTemplate } from "../domain/defaults";
import type { ClassTemplate } from "../domain/types";
import { migrateTemplate } from "../validation/migrations";

export const TEMPLATE_STORE_KEY = "kudos.classTemplates.v1";
export const ACTIVE_SESSION_KEY = "kudos.activeSession.v1";

const canUseStorage = () => typeof window !== "undefined" && "localStorage" in window;

export const loadTemplates = (): ClassTemplate[] => {
  if (!canUseStorage()) return [createDefaultTemplate()];
  const raw = window.localStorage.getItem(TEMPLATE_STORE_KEY);
  if (!raw) {
    const starter = createDefaultTemplate();
    saveTemplates([starter]);
    return [starter];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Template store must be an array.");
    const templates = parsed.map(migrateTemplate);
    return templates.length > 0 ? templates : [createDefaultTemplate()];
  } catch {
    const starter = createDefaultTemplate();
    saveTemplates([starter]);
    return [starter];
  }
};

export const saveTemplates = (templates: ClassTemplate[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TEMPLATE_STORE_KEY, JSON.stringify(templates));
};

export const upsertTemplate = (template: ClassTemplate) => {
  const templates = loadTemplates();
  const next = templates.some((candidate) => candidate.id === template.id)
    ? templates.map((candidate) => (candidate.id === template.id ? template : candidate))
    : [...templates, template];
  saveTemplates(next);
  return next;
};
