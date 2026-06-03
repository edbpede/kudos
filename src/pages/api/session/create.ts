import type { APIRoute } from "astro";
import { createSessionFromTemplate } from "../../../lib/domain/session";
import { getLiveTtlSeconds } from "../../../lib/server/env";
import { getRelay, getRelayDiagnostics } from "../../../lib/server/relay";
import { normalizeError } from "../../../lib/validation/errors";
import { createLiveSessionSchema } from "../../../lib/validation/schemas";

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});

export const POST: APIRoute = async ({ request, url }) => {
	try {
		// Refuse to start a live session when the deployment has no durable store.
		// On serverless the in-memory relay lives in a single instance, so the
		// session would silently vanish once another instance handles a request
		// (typically after a few stars). Failing fast with an actionable message
		// is far better than handing the teacher a session that dies mid-class.
		const diagnostics = getRelayDiagnostics();
		if (diagnostics.serverless && !diagnostics.durable) {
			return json(
				{
					ok: false,
					code: "RELAY_NOT_DURABLE",
					message:
						"Live sessions are unavailable on this deployment: no shared session store is configured, so a live session would not survive. Configure a Redis store (KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN) and redeploy. Diagnostics: /api/session/health.",
				},
				503,
			);
		}
		const payload = createLiveSessionSchema.parse(await request.json());
		const session = createSessionFromTemplate(payload.template, "live");
		const created = await getRelay().create(
			session,
			payload.ttlSeconds ?? getLiveTtlSeconds(),
		);
		const displayUrl = new URL(
			`/session/${created.sessionId}/display`,
			url.origin,
		);
		displayUrl.searchParams.set("token", created.displayToken);
		const teacherUrl = new URL(
			`/session/${created.sessionId}/teacher`,
			url.origin,
		);
		teacherUrl.searchParams.set("token", created.teacherToken);
		return json(
			{
				ok: true,
				...created,
				displayUrl: displayUrl.toString(),
				teacherUrl: teacherUrl.toString(),
			},
			201,
		);
	} catch (error) {
		return json(normalizeError(error), 400);
	}
};
