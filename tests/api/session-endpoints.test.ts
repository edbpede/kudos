import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createDefaultTemplate } from "../../src/lib/domain/defaults";
import { getMemoryRelayForTests } from "../../src/lib/server/relay";
import { GET as displayGet } from "../../src/pages/api/session/[sessionId]/display";
import { POST as endPost } from "../../src/pages/api/session/[sessionId]/end";
import { POST as eventPost } from "../../src/pages/api/session/[sessionId]/event";
import { POST as settingsPost } from "../../src/pages/api/session/[sessionId]/settings";
import { POST as undoPost } from "../../src/pages/api/session/[sessionId]/undo";
import { POST as createPost } from "../../src/pages/api/session/create";

const context = (request: Request, url: string, params: Record<string, string> = {}) =>
  ({ request, url: new URL(url), params }) as never;
const jsonRequest = (url: string, body: unknown, headers: HeadersInit = {}) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
const totalFor = (displayState: { students: { id: string; total: number }[] }, studentId: string) =>
  displayState.students.find((student) => student.id === studentId)?.total;
const originalLiveTtl = process.env.KUDOS_LIVE_TTL_SECONDS;

describe("session endpoints", () => {
  beforeEach(() => {
    getMemoryRelayForTests().clear();
    delete process.env.KUDOS_LIVE_TTL_SECONDS;
  });

  afterEach(() => {
    if (originalLiveTtl === undefined) delete process.env.KUDOS_LIVE_TTL_SECONDS;
    else process.env.KUDOS_LIVE_TTL_SECONDS = originalLiveTtl;
  });

  test("create defaults live sessions to a 12 hour auto-destroy TTL", async () => {
    const createResponse = await createPost(
      context(
        jsonRequest("http://localhost/api/session/create", {
          template: createDefaultTemplate(),
        }),
        "http://localhost/api/session/create",
      ),
    );
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    const secondsUntilExpiry = Math.round((Date.parse(created.expiresAt) - Date.now()) / 1000);
    expect(secondsUntilExpiry).toBeGreaterThan(43_190);
    expect(secondsUntilExpiry).toBeLessThanOrEqual(43_200);
    expect(created.displayState.expiresAt).toBe(created.expiresAt);
  });

  test("create rejects TTLs beyond the 12 hour destruction window", async () => {
    const createResponse = await createPost(
      context(
        jsonRequest("http://localhost/api/session/create", {
          template: createDefaultTemplate(),
          ttlSeconds: 43_201,
        }),
        "http://localhost/api/session/create",
      ),
    );
    expect(createResponse.status).toBe(400);
  });

  test("create refuses live sessions when serverless has no durable store", async () => {
    const originalVercel = process.env.VERCEL;
    process.env.VERCEL = "1";
    try {
      const response = await createPost(
        context(
          jsonRequest("http://localhost/api/session/create", {
            template: createDefaultTemplate(),
          }),
          "http://localhost/api/session/create",
        ),
      );
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("RELAY_NOT_DURABLE");
    } finally {
      if (originalVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = originalVercel;
    }
  });

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
    expect(JSON.stringify(await displayResponse.json())).not.toContain(created.teacherToken);

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
    expect(totalFor(acceptedBody.displayState, studentId)).toBe(1);
  });

  test("successive teacher event posts mutate live display state cumulatively", async () => {
    const createResponse = await createPost(
      context(
        jsonRequest("http://localhost/api/session/create", {
          template: createDefaultTemplate(),
        }),
        "http://localhost/api/session/create",
      ),
    );
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    const [firstStudent, secondStudent] = created.displayState.students;
    const eventUrl = `http://localhost/api/session/${created.sessionId}/event`;
    const postEvent = (studentId: string, delta: 1 | -1) =>
      eventPost(
        context(
          jsonRequest(
            eventUrl,
            { studentId, delta },
            { authorization: `Bearer ${created.teacherToken}` },
          ),
          eventUrl,
          { sessionId: created.sessionId },
        ),
      );

    const firstAdd = await postEvent(firstStudent.id, 1);
    const firstAddBody = await firstAdd.json();
    expect(firstAdd.status).toBe(200);
    expect(totalFor(firstAddBody.displayState, firstStudent.id)).toBe(1);

    const secondAdd = await postEvent(secondStudent.id, 1);
    const secondAddBody = await secondAdd.json();
    expect(secondAdd.status).toBe(200);
    expect(totalFor(secondAddBody.displayState, firstStudent.id)).toBe(1);
    expect(totalFor(secondAddBody.displayState, secondStudent.id)).toBe(1);

    const firstAddAgain = await postEvent(firstStudent.id, 1);
    const firstAddAgainBody = await firstAddAgain.json();
    expect(firstAddAgain.status).toBe(200);
    expect(totalFor(firstAddAgainBody.displayState, firstStudent.id)).toBe(2);
    expect(totalFor(firstAddAgainBody.displayState, secondStudent.id)).toBe(1);
  });

  test("display endpoint allows read-only teacher reconnect without leaking tokens", async () => {
    const createResponse = await createPost(
      context(
        jsonRequest("http://localhost/api/session/create", {
          template: createDefaultTemplate(),
        }),
        "http://localhost/api/session/create",
      ),
    );
    const created = await createResponse.json();
    const displayApiUrl = `http://localhost/api/session/${created.sessionId}/display`;

    const teacherReconnect = await displayGet(
      context(
        new Request(displayApiUrl, {
          headers: { authorization: `Bearer ${created.teacherToken}` },
        }),
        displayApiUrl,
        { sessionId: created.sessionId },
      ),
    );
    expect(teacherReconnect.status).toBe(200);
    const reconnectBody = await teacherReconnect.json();
    expect(reconnectBody.ok).toBe(true);
    expect(reconnectBody.displayState.className).toBe(created.displayState.className);
    expect(JSON.stringify(reconnectBody)).not.toContain(created.teacherToken);
    expect(JSON.stringify(reconnectBody)).not.toContain(created.displayToken);

    const rejectedTeacherHeaders: HeadersInit[] = [
      { authorization: `Bearer ${created.displayToken}` },
      { "x-teacher-token": created.displayToken },
    ];
    for (const headers of rejectedTeacherHeaders) {
      const displayTokenAsTeacher = await displayGet(
        context(new Request(displayApiUrl, { headers }), displayApiUrl, {
          sessionId: created.sessionId,
        }),
      );
      expect(displayTokenAsTeacher.status).toBe(401);
      expect((await displayTokenAsTeacher.json()).code).toBe("UNAUTHORIZED");
    }
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

  test("ending a live session cleans up the server record", async () => {
    const createResponse = await createPost(
      context(
        jsonRequest("http://localhost/api/session/create", {
          template: createDefaultTemplate(),
        }),
        "http://localhost/api/session/create",
      ),
    );
    const created = await createResponse.json();
    const ended = await endPost(
      context(
        jsonRequest(
          `http://localhost/api/session/${created.sessionId}/end`,
          {},
          { authorization: `Bearer ${created.teacherToken}` },
        ),
        `http://localhost/api/session/${created.sessionId}/end`,
        { sessionId: created.sessionId },
      ),
    );
    expect(ended.status).toBe(200);
    const endedBody = await ended.json();
    expect(endedBody.displayState.status).toBe("ended");

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
