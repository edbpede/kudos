import type { APIRoute } from "astro";
import { readBearerToken } from "../../../../lib/relay/auth";
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

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const displayState = await getRelay().undo(params.sessionId ?? "", readBearerToken(request));
    return json({ ok: true, displayState });
  } catch (error) {
    return json(
      normalizeError(error),
      error instanceof RelayError && error.code === "UNAUTHORIZED" ? 401 : 400,
    );
  }
};
