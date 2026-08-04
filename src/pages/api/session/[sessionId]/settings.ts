import type { APIRoute } from "astro";
import { readBearerToken } from "../../../../lib/relay/auth";
import { RelayError } from "../../../../lib/relay/types";
import { getRelay } from "../../../../lib/server/relay";
import { normalizeError } from "../../../../lib/validation/errors";
import { settingsUpdateSchema } from "../../../../lib/validation/schemas";

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
    const payload = settingsUpdateSchema.parse(await request.json());
    const displayState = await getRelay().updateSettings(
      params.sessionId ?? "",
      readBearerToken(request),
      payload.preferences ?? {},
    );
    return json({ ok: true, displayState });
  } catch (error) {
    return json(
      normalizeError(error),
      error instanceof RelayError && error.code === "UNAUTHORIZED" ? 401 : 400,
    );
  }
};
