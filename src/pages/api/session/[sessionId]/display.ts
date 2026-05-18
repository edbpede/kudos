import type { APIRoute } from "astro";
import { expiredDisplayState } from "../../../../lib/relay/displayState";
import { RelayError } from "../../../../lib/relay/types";
import { getRelay } from "../../../../lib/server/relay";
import { normalizeError } from "../../../../lib/validation/errors";

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"cache-control": "no-store",
		},
	});

export const GET: APIRoute = async ({ params, url }) => {
	const sessionId = params.sessionId ?? "";
	const token = url.searchParams.get("token") ?? "";
	try {
		const displayState = await getRelay().readDisplay(sessionId, token);
		return json({ ok: true, displayState });
	} catch (error) {
		if (
			error instanceof RelayError &&
			(error.code === "EXPIRED" ||
				error.code === "NOT_FOUND" ||
				error.code === "PURGED")
		) {
			return json(
				{
					ok: false,
					code: error.code,
					message: error.message,
					displayState: expiredDisplayState(sessionId),
				},
				error.code === "EXPIRED" ? 410 : 404,
			);
		}
		return json(
			normalizeError(error),
			error instanceof RelayError && error.code === "UNAUTHORIZED" ? 401 : 400,
		);
	}
};
