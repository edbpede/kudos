import { applyStarEvent, endSession, undoLastEvent } from "../domain/session";
import type { ClassroomSession, TeacherPreferences } from "../domain/types";
import {
	createSecretToken,
	hashTeacherToken,
	verifyTeacherToken,
} from "./auth";
import { toDisplayState } from "./displayState";
import type { LiveRelay, LiveSessionCreated, LiveSessionRecord } from "./types";
import { RelayError } from "./types";

interface RedisRestOptions {
	url: string;
	token: string;
	prefix?: string;
}

export class RedisRestRelay implements LiveRelay {
	private readonly prefix: string;

	constructor(private readonly options: RedisRestOptions) {
		this.prefix = options.prefix ?? "kudos:live:";
	}

	async create(
		session: ClassroomSession,
		ttlSeconds: number,
	): Promise<LiveSessionCreated> {
		const teacherToken = createSecretToken("teacher");
		const displayToken = createSecretToken("display");
		const now = new Date();
		const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
		const record: LiveSessionRecord = {
			id: session.id,
			session: { ...session, mode: "live" },
			teacherTokenHash: hashTeacherToken(teacherToken),
			displayToken,
			createdAt: now.toISOString(),
			updatedAt: now.toISOString(),
			expiresAt,
			ttlSeconds,
		};
		await this.command([
			"SET",
			this.key(session.id),
			JSON.stringify(record),
			"EX",
			String(ttlSeconds),
		]);
		return {
			sessionId: session.id,
			teacherToken,
			displayToken,
			expiresAt,
			displayState: toDisplayState(record),
		};
	}

	async readDisplay(sessionId: string, displayToken: string) {
		const record = await this.readRecord(sessionId);
		if (record.displayToken !== displayToken)
			throw new RelayError("Display token is invalid.", "UNAUTHORIZED");
		return toDisplayState(record);
	}

	async readTeacher(sessionId: string, teacherToken: string) {
		return toDisplayState(await this.authorize(sessionId, teacherToken));
	}

	async applyEvent(
		sessionId: string,
		teacherToken: string,
		input: { studentId: string; delta: 1 | -1; reason?: string },
	) {
		const record = await this.authorize(sessionId, teacherToken);
		record.session = applyStarEvent(record.session, input);
		return this.saveAndDisplay(record);
	}

	async undo(sessionId: string, teacherToken: string) {
		const record = await this.authorize(sessionId, teacherToken);
		record.session = undoLastEvent(record.session);
		return this.saveAndDisplay(record);
	}

	async updateSettings(
		sessionId: string,
		teacherToken: string,
		preferences: Partial<TeacherPreferences>,
	) {
		const record = await this.authorize(sessionId, teacherToken);
		record.session = {
			...record.session,
			preferences: { ...record.session.preferences, ...preferences },
			updatedAt: new Date().toISOString(),
			version: record.session.version + 1,
		};
		return this.saveAndDisplay(record);
	}

	async end(sessionId: string, teacherToken: string) {
		const record = await this.authorize(sessionId, teacherToken);
		record.session = endSession(record.session);
		record.updatedAt = record.session.updatedAt;
		await this.command(["DEL", this.key(sessionId)]);
		return toDisplayState(record);
	}

	async purge(sessionId: string, teacherToken: string) {
		await this.authorize(sessionId, teacherToken);
		await this.command(["DEL", this.key(sessionId)]);
	}

	private async saveAndDisplay(record: LiveSessionRecord) {
		record.updatedAt = new Date().toISOString();
		const remainingTtl = Math.max(
			1,
			Math.ceil((Date.parse(record.expiresAt) - Date.now()) / 1000),
		);
		await this.command([
			"SET",
			this.key(record.id),
			JSON.stringify(record),
			"EX",
			String(remainingTtl),
		]);
		return toDisplayState(record);
	}

	private async readRecord(sessionId: string): Promise<LiveSessionRecord> {
		const value = await this.command<string | null>([
			"GET",
			this.key(sessionId),
		]);
		if (!value)
			throw new RelayError(
				"This live session is no longer available.",
				"NOT_FOUND",
			);
		const record = JSON.parse(value) as LiveSessionRecord;
		if (Date.parse(record.expiresAt) <= Date.now()) {
			await this.command(["DEL", this.key(sessionId)]);
			throw new RelayError("This live session has expired.", "EXPIRED");
		}
		return record;
	}

	private async authorize(sessionId: string, teacherToken: string) {
		const record = await this.readRecord(sessionId);
		if (
			!teacherToken ||
			!verifyTeacherToken(teacherToken, record.teacherTokenHash)
		) {
			throw new RelayError(
				"Teacher authorization is required.",
				"UNAUTHORIZED",
			);
		}
		return record;
	}

	private async command<T = unknown>(command: string[]): Promise<T> {
		const response = await fetch(this.options.url, {
			method: "POST",
			headers: {
				authorization: `Bearer ${this.options.token}`,
				"content-type": "application/json",
			},
			body: JSON.stringify(command),
		});

		if (!response.ok) {
			throw new Error(`Redis REST command failed with ${response.status}.`);
		}

		const body = (await response.json()) as { result?: T; error?: string };
		if (body.error) throw new Error(body.error);
		return body.result as T;
	}

	private key(sessionId: string) {
		return `${this.prefix}${sessionId}`;
	}
}
