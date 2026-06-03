import type { APIRoute } from "astro";
import { getRelayDiagnostics } from "../../../lib/server/relay";

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"cache-control": "no-store",
		},
	});

/**
 * Non-secret live-relay health check.
 *
 * Hit this in production (e.g. /api/session/health) to confirm whether live
 * sessions are backed by a durable Redis store or have silently fallen back to
 * the per-instance in-memory relay. The memory fallback cannot survive
 * serverless cold starts, which surfaces as 404 NOT_FOUND on /display and 400
 * on /event. No credentials or session data are exposed.
 */
export const GET: APIRoute = () => {
	const diagnostics = getRelayDiagnostics();
	return json({
		ok: diagnostics.durable,
		...diagnostics,
	});
};
