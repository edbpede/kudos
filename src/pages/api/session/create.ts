import type { APIRoute } from "astro";
import { createSessionFromTemplate } from "../../../lib/domain/session";
import { getLiveTtlSeconds } from "../../../lib/server/env";
import { getRelay } from "../../../lib/server/relay";
import { normalizeError } from "../../../lib/validation/errors";
import { createLiveSessionSchema } from "../../../lib/validation/schemas";

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});

export const POST: APIRoute = async ({ request, url }) => {
	try {
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
