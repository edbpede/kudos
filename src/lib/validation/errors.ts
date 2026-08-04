import { ZodError } from "zod";
import { DomainError } from "../domain/session";
import { RelayError } from "../relay/types";

export interface AppErrorBody {
  ok: false;
  code: string;
  message: string;
  issues?: string[];
}

export const toValidationMessages = (error: ZodError) =>
  error.issues.map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`);

export const normalizeError = (error: unknown): AppErrorBody => {
  if (error instanceof ZodError) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Please fix the highlighted data and try again.",
      issues: toValidationMessages(error),
    };
  }

  if (error instanceof DomainError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof RelayError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      ok: false,
      code: "APP_ERROR",
      message: error.message,
    };
  }

  return {
    ok: false,
    code: "APP_ERROR",
    message: "Something went wrong.",
  };
};
