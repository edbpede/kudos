import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type Capability = "teacher" | "display";

export const createSecretToken = (capability: Capability) =>
  `${capability}_${randomBytes(24).toString("base64url")}`;

export const hashTeacherToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const verifyTeacherToken = (token: string, expectedHash: string) => {
  const actual = Buffer.from(hashTeacherToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const readBearerToken = (request: Request) => {
  const header =
    request.headers.get("authorization") ?? request.headers.get("x-teacher-token") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return header.trim();
};
