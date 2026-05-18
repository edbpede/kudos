import { beforeEach, describe, expect, test } from "bun:test";
import { createDefaultTemplate } from "../../src/lib/domain/defaults";
import { getMemoryRelayForTests } from "../../src/lib/server/relay";
import { GET as displayGet } from "../../src/pages/api/session/[sessionId]/display";
import { POST as endPost } from "../../src/pages/api/session/[sessionId]/end";
import { POST as eventPost } from "../../src/pages/api/session/[sessionId]/event";
import { POST as settingsPost } from "../../src/pages/api/session/[sessionId]/settings";
import { POST as undoPost } from "../../src/pages/api/session/[sessionId]/undo";
import { POST as createPost } from "../../src/pages/api/session/create";

const context = (
	request: Request,
	url: string,
	params: Record<string, string> = {},
) => ({ request, url: new URL(url), params }) as never;
const jsonRequest = (url: string, body: unknown, headers: HeadersInit = {}) =>
	new Request(url, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});

describe("session endpoints", () => {
	beforeEach(() => getMemoryRelayForTests().clear());

	test("create/display/event flow and display-token mutation rejection", async () => {
		const template = createDefaultTemplate();
		const createResponse = await createPost(
			context(
				jsonRequest("http://localhost/api/session/create", { template }),
				"http://localhost/api/session/create",
			),
		);
		expect(createResponse.status).toBe(201);
		const created = await createResponse.json();
		const studentId = created.displayState.students[0].id;

		const displayResponse = await displayGet(
			context(new Request(created.displayUrl), created.displayUrl, {
				sessionId: created.sessionId,
			}),
		);
		expect(displayResponse.status).toBe(200);
		expect(JSON.stringify(await displayResponse.json())).not.toContain(
			created.teacherToken,
		);

		const rejected = await eventPost(
			context(
				jsonRequest(
					`http://localhost/api/session/${created.sessionId}/event`,
					{ studentId, delta: 1 },
					{ authorization: `Bearer ${created.displayToken}` },
				),
				`http://localhost/api/session/${created.sessionId}/event`,
				{ sessionId: created.sessionId },
			),
		);
		expect(rejected.status).toBe(401);

		const accepted = await eventPost(
			context(
				jsonRequest(
					`http://localhost/api/session/${created.sessionId}/event`,
					{ studentId, delta: 1 },
					{ authorization: `Bearer ${created.teacherToken}` },
				),
				`http://localhost/api/session/${created.sessionId}/event`,
				{ sessionId: created.sessionId },
			),
		);
		const acceptedBody = await accepted.json();
		expect(accepted.status).toBe(200);
		expect(acceptedBody.displayState.students[0].total).toBe(1);
	});

	test("mutating endpoints reject missing invalid display-only and expired credentials", async () => {
		const createResponse = await createPost(
			context(
				jsonRequest("http://localhost/api/session/create", {
					template: createDefaultTemplate(),
				}),
				"http://localhost/api/session/create",
			),
		);
		const created = await createResponse.json();
		const studentId = created.displayState.students[0].id;

		const missing = await eventPost(
			context(
				jsonRequest(`http://localhost/api/session/${created.sessionId}/event`, {
					studentId,
					delta: 1,
				}),
				`http://localhost/api/session/${created.sessionId}/event`,
				{ sessionId: created.sessionId },
			),
		);
		expect(missing.status).toBe(401);

		const invalidUndo = await undoPost(
			context(
				jsonRequest(
					`http://localhost/api/session/${created.sessionId}/undo`,
					{},
					{ authorization: "Bearer invalid" },
				),
				`http://localhost/api/session/${created.sessionId}/undo`,
				{ sessionId: created.sessionId },
			),
		);
		expect(invalidUndo.status).toBe(401);

		const displaySettings = await settingsPost(
			context(
				jsonRequest(
					`http://localhost/api/session/${created.sessionId}/settings`,
					{ preferences: { showRewards: false } },
					{ authorization: `Bearer ${created.displayToken}` },
				),
				`http://localhost/api/session/${created.sessionId}/settings`,
				{ sessionId: created.sessionId },
			),
		);
		expect(displaySettings.status).toBe(401);

		const displayEnd = await endPost(
			context(
				jsonRequest(
					`http://localhost/api/session/${created.sessionId}/end`,
					{},
					{ authorization: `Bearer ${created.displayToken}` },
				),
				`http://localhost/api/session/${created.sessionId}/end`,
				{ sessionId: created.sessionId },
			),
		);
		expect(displayEnd.status).toBe(401);

		const records = (
			getMemoryRelayForTests() as unknown as {
				records: Map<string, { expiresAt: string }>;
			}
		).records;
		const record = records.get(created.sessionId);
		if (record) record.expiresAt = "2000-01-01T00:00:00.000Z";
		const expired = await eventPost(
			context(
				jsonRequest(
					`http://localhost/api/session/${created.sessionId}/event`,
					{ studentId, delta: 1 },
					{ authorization: `Bearer ${created.teacherToken}` },
				),
				`http://localhost/api/session/${created.sessionId}/event`,
				{ sessionId: created.sessionId },
			),
		);
		expect(expired.status).toBe(400);
		expect((await expired.json()).code).toBe("EXPIRED");
	});

	test("manual purge removes display state", async () => {
		const createResponse = await createPost(
			context(
				jsonRequest("http://localhost/api/session/create", {
					template: createDefaultTemplate(),
				}),
				"http://localhost/api/session/create",
			),
		);
		const created = await createResponse.json();
		const purge = await endPost(
			context(
				jsonRequest(
					`http://localhost/api/session/${created.sessionId}/end?purge=1`,
					{},
					{ authorization: `Bearer ${created.teacherToken}` },
				),
				`http://localhost/api/session/${created.sessionId}/end?purge=1`,
				{ sessionId: created.sessionId },
			),
		);
		expect(purge.status).toBe(200);
		const displayResponse = await displayGet(
			context(new Request(created.displayUrl), created.displayUrl, {
				sessionId: created.sessionId,
			}),
		);
		expect(displayResponse.status).toBe(404);
		const body = await displayResponse.json();
		expect(body.displayState.students).toHaveLength(0);
	});
});
