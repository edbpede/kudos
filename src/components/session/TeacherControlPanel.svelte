<script lang="ts">
import { onMount } from "svelte";
import {
	applyStarEvent,
	deriveDisplayState,
	endSession,
	reactivateSession,
	resetSession,
	undoLastEvent,
} from "../../lib/domain/session";
import type { ClassroomSession, DisplayState } from "../../lib/domain/types";
import { ACTIVE_SESSION_KEY } from "../../lib/persistence/localTemplateStore";

interface Props {
	mode: "local" | "live";
	sessionId?: string;
	teacherToken?: string;
}

let { mode, sessionId = "", teacherToken = "" }: Props = $props();

let session = $state<ClassroomSession | null>(null);
let displayState = $state<DisplayState | null>(null);
let message = $state("Loading session…");
let displayUrl = $state("");
let busy = $state(false);

const liveStorageKey = () => `kudos.live.${sessionId}`;

const saveLocal = (next: ClassroomSession) => {
	session = next;
	displayState = deriveDisplayState(next);
	window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(next));
	message = "Session updated.";
};

const loadLocal = () => {
	const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY);
	if (!raw) {
		message = "No local session found. Return to setup to start one.";
		return;
	}
	session = JSON.parse(raw) as ClassroomSession;
	displayState = deriveDisplayState(session);
	displayUrl = `${window.location.origin}/local/display`;
	message = "Local teacher controls are ready.";
};

const loadLive = () => {
	const raw = window.localStorage.getItem(liveStorageKey());
	const record = raw ? JSON.parse(raw) : null;
	displayState = record?.displayState ?? null;
	displayUrl = record?.displayUrl ?? "";
	message = displayState
		? "Live teacher controls are ready."
		: "Live session metadata was not found in this browser.";
};

onMount(() => {
	if (mode === "local") loadLocal();
	else loadLive();
});

const updateLiveStorage = (body: { displayState?: DisplayState }) => {
	if (!body.displayState) return;
	displayState = body.displayState;
	const raw = window.localStorage.getItem(liveStorageKey());
	const record = raw ? JSON.parse(raw) : {};
	window.localStorage.setItem(
		liveStorageKey(),
		JSON.stringify({ ...record, displayState }),
	);
};

const callLive = async (path: string, body: unknown = {}) => {
	busy = true;
	try {
		const response = await fetch(`/api/session/${sessionId}/${path}`, {
			method: "POST",
			headers: {
				authorization: `Bearer ${teacherToken}`,
				"content-type": "application/json",
			},
			body: JSON.stringify(body),
		});
		const result = await response.json();
		if (!response.ok || !result.ok)
			throw new Error(result.message ?? "Live update failed.");
		updateLiveStorage(result);
		message = "Live session updated.";
		return result;
	} catch (error) {
		message = error instanceof Error ? error.message : "Live update failed.";
	} finally {
		busy = false;
	}
};

const add = (studentId: string) => {
	if (mode === "local" && session)
		saveLocal(applyStarEvent(session, { studentId, delta: 1 }));
	else void callLive("event", { studentId, delta: 1 });
};

const remove = (studentId: string) => {
	if (mode === "local" && session) {
		try {
			saveLocal(applyStarEvent(session, { studentId, delta: -1 }));
		} catch (error) {
			message =
				error instanceof Error ? error.message : "Could not remove star.";
		}
	} else void callLive("event", { studentId, delta: -1 });
};

const undo = () => {
	if (mode === "local" && session) {
		try {
			saveLocal(undoLastEvent(session));
		} catch (error) {
			message = error instanceof Error ? error.message : "Nothing to undo.";
		}
	} else void callLive("undo");
};

const reset = () => {
	if (!confirm("Reset all stars for this session?")) return;
	if (mode === "local" && session)
		saveLocal(reactivateSession(resetSession(session)));
	else
		message =
			"Live reset is intentionally not exposed; use undo or end/purge for remote sessions.";
};

const end = () => {
	if (!confirm("End this classroom session?")) return;
	if (mode === "local" && session) saveLocal(endSession(session));
	else void callLive("end");
};

const purge = () => {
	if (
		!confirm(
			"Purge the temporary live session now? The display URL will expire immediately.",
		)
	)
		return;
	void callLive("end?purge=1").then(() => {
		window.localStorage.removeItem(liveStorageKey());
		message = "Live session purged.";
	});
};
</script>

<section class="mx-auto max-w-7xl p-4 sm:p-6">
  <div class="k-card p-5">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-wide text-amber-700">{mode === "live" ? "Live teacher" : "Local teacher"}</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">{displayState?.className ?? "Kudos session"}</h1>
        <p class="mt-2 text-slate-700" aria-live="polite">{message}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a class="k-button-soft" href="/">Setup</a>
        {#if displayUrl}<a class="k-button-soft" href={displayUrl} target="_blank" rel="noreferrer">Open display</a>{/if}
        <button class="k-button-soft" type="button" disabled={busy} onclick={undo}>Undo</button>
        <button class="k-button-soft" type="button" disabled={busy} onclick={reset}>Reset</button>
        <button class="k-button-soft" type="button" disabled={busy} onclick={end}>End</button>
        {#if mode === "live"}<button class="k-button-soft" type="button" disabled={busy} onclick={purge}>Purge live</button>{/if}
      </div>
    </div>
  </div>

  {#if displayState}
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each displayState.students as student}
        <article class="k-card p-4" aria-label={`${student.label} has ${student.total} stars`}>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-xl font-black text-slate-950">{student.label}</h2>
              {#if student.group}<p class="text-sm text-slate-500">{student.group}</p>{/if}
            </div>
            <div class="rounded-2xl bg-amber-100 px-3 py-1 text-2xl font-black text-amber-900">⭐ {student.total}</div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <button class="k-button-primary text-lg" type="button" disabled={busy || displayState.status !== "active"} aria-label={`Add star for ${student.label}`} onclick={() => add(student.id)}>+ Star</button>
            <button class="k-button-soft text-lg" type="button" disabled={busy || displayState.status !== "active" || student.total <= 0} aria-label={`Remove star from ${student.label}`} onclick={() => remove(student.id)}>− Star</button>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <div class="k-card mt-6 p-8 text-center text-slate-700">No session state is available.</div>
  {/if}
</section>
