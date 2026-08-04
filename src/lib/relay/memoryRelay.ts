import { applyStarEvent, endSession, undoLastEvent } from "../domain/session";
import type { ClassroomSession, TeacherPreferences } from "../domain/types";
import { createSecretToken, hashTeacherToken, verifyTeacherToken } from "./auth";
import { toDisplayState } from "./displayState";
import type { LiveRelay, LiveSessionCreated, LiveSessionRecord } from "./types";
import { RelayError } from "./types";

const clone = <T>(value: T): T => structuredClone(value);

export class MemoryRelay implements LiveRelay {
  private readonly records = new Map<string, LiveSessionRecord>();

  clear() {
    this.records.clear();
  }

  async create(session: ClassroomSession, ttlSeconds: number): Promise<LiveSessionCreated> {
    const teacherToken = createSecretToken("teacher");
    const displayToken = createSecretToken("display");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    const liveSession = { ...clone(session), mode: "live" as const };
    const record: LiveSessionRecord = {
      id: session.id,
      session: liveSession,
      teacherTokenHash: hashTeacherToken(teacherToken),
      displayToken,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt,
      ttlSeconds,
    };
    this.records.set(record.id, record);
    return {
      sessionId: record.id,
      teacherToken,
      displayToken,
      expiresAt,
      displayState: toDisplayState(record),
    };
  }

  async readDisplay(sessionId: string, displayToken: string) {
    const record = this.readRecord(sessionId);
    if (record.displayToken !== displayToken)
      throw new RelayError("Display token is invalid.", "UNAUTHORIZED");
    return toDisplayState(record);
  }

  async readTeacher(sessionId: string, teacherToken: string) {
    return toDisplayState(this.authorize(sessionId, teacherToken));
  }

  async applyEvent(
    sessionId: string,
    teacherToken: string,
    input: { studentId: string; delta: 1 | -1; reason?: string },
  ) {
    const record = this.authorize(sessionId, teacherToken);
    record.session = applyStarEvent(record.session, input);
    record.updatedAt = new Date().toISOString();
    this.records.set(sessionId, record);
    return toDisplayState(record);
  }

  async undo(sessionId: string, teacherToken: string) {
    const record = this.authorize(sessionId, teacherToken);
    record.session = undoLastEvent(record.session);
    record.updatedAt = new Date().toISOString();
    this.records.set(sessionId, record);
    return toDisplayState(record);
  }

  async updateSettings(
    sessionId: string,
    teacherToken: string,
    preferences: Partial<TeacherPreferences>,
  ) {
    const record = this.authorize(sessionId, teacherToken);
    record.session = {
      ...record.session,
      preferences: { ...record.session.preferences, ...preferences },
      updatedAt: new Date().toISOString(),
      version: record.session.version + 1,
    };
    record.updatedAt = record.session.updatedAt;
    this.records.set(sessionId, record);
    return toDisplayState(record);
  }

  async end(sessionId: string, teacherToken: string) {
    const record = this.authorize(sessionId, teacherToken);
    record.session = endSession(record.session);
    record.updatedAt = record.session.updatedAt;
    this.records.delete(sessionId);
    return toDisplayState(record);
  }

  async purge(sessionId: string, teacherToken: string) {
    this.authorize(sessionId, teacherToken);
    this.records.delete(sessionId);
  }

  private readRecord(sessionId: string) {
    const record = this.records.get(sessionId);
    if (!record) throw new RelayError("This live session is no longer available.", "NOT_FOUND");
    if (Date.parse(record.expiresAt) <= Date.now()) {
      this.records.delete(sessionId);
      throw new RelayError("This live session has expired.", "EXPIRED");
    }
    return clone(record);
  }

  private authorize(sessionId: string, teacherToken: string) {
    const record = this.readRecord(sessionId);
    if (!teacherToken || !verifyTeacherToken(teacherToken, record.teacherTokenHash)) {
      throw new RelayError("Teacher authorization is required.", "UNAUTHORIZED");
    }
    return record;
  }
}
