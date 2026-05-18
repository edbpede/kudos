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

let session: ClassroomSession | null = null;
let displayState = $state<DisplayState | null>(null);
let message = $state("Loading session…");
let displayUrl = $state("");
let busy = $state(false);

const liveStorageKey = () => `kudos.live.${sessionId}`;
const totalStars = (state: DisplayState) =>
	state.students.reduce((sum, student) => sum + student.total, 0);
const active = (state: DisplayState | null) => state?.status === "active";
const statusLabel = (state: DisplayState | null) =>
	state ? state.status.toUpperCase() : "WAITING";

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
	const next = JSON.parse(raw) as ClassroomSession;
	session = next;
	displayState = deriveDisplayState(next);
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

const copyDisplayUrl = () => {
	if (!displayUrl) return;
	void navigator.clipboard?.writeText(displayUrl)?.then(
		() => {
			message = "Display link copied.";
		},
		() => {
			message = "Display link is ready below.";
		},
	);
};
</script>

<section class="k-page">
  <div class="k-card overflow-hidden">
    <div class="relative border-b border-white/10 p-5 sm:p-6">
      <div class="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl"></div>
      <div class="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <p class="k-eyebrow">{mode === "live" ? "Live teacher console" : "Local teacher console"}</p>
          <h1 class="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">{displayState?.className ?? "Kudos session"}</h1>
          <p class="mt-3 max-w-3xl text-base leading-7 text-slate-300" aria-live="polite">{message}</p>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 lg:w-72 lg:grid-cols-1">
          <a class="k-button-soft" href="/">Setup</a>
          {#if displayUrl}<a class="k-button-primary" href={displayUrl} target="_blank" rel="noreferrer">Open display</a>{/if}
        </div>
      </div>

      {#if displayState}
        <div class="relative mt-6 grid gap-3 sm:grid-cols-3">
          <div class="k-stat"><p class="k-eyebrow">Status</p><p class="mt-1 text-2xl font-black">{statusLabel(displayState)}</p></div>
          <div class="k-stat"><p class="k-eyebrow">Students</p><p class="mt-1 text-2xl font-black">{displayState.students.length}</p></div>
          <div class="k-stat"><p class="k-eyebrow">Total stars</p><p class="mt-1 text-2xl font-black">⭐ {totalStars(displayState)}</p></div>
        </div>
      {/if}
    </div>

    <div class="grid gap-6 p-5 sm:p-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside class="grid content-start gap-3">
        <section class="k-panel p-4">
          <p class="k-eyebrow">Operations</p>
          <div class="mt-4 grid gap-2">
            <button class="k-button-soft" type="button" disabled={busy || !displayState} onclick={undo}>Undo last star</button>
            <button class="k-button-soft" type="button" disabled={busy || !displayState || mode === "live"} onclick={reset}>Reset local stars</button>
            <button class="k-button-danger" type="button" disabled={busy || !displayState || !active(displayState)} onclick={end}>End session</button>
            {#if mode === "live"}<button class="k-button-danger" type="button" disabled={busy || !displayState} onclick={purge}>Purge live session</button>{/if}
          </div>
        </section>

        <section class="k-panel p-4">
          <p class="k-eyebrow">Display link</p>
          {#if displayUrl}
            <p class="mt-3 break-all rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-3 text-sm leading-6 text-cyan-100">{displayUrl}</p>
            <button class="k-button-soft mt-3 w-full" type="button" onclick={copyDisplayUrl}>Copy link</button>
          {:else}
            <p class="mt-3 text-sm leading-6 text-slate-300">Start or restore a session to reveal the read-only display link.</p>
          {/if}
        </section>
      </aside>

      {#if displayState}
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {#each displayState.students as student}
            <article class="k-panel-soft p-4" aria-label={`${student.label} has ${student.total} stars`}>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h2 class="truncate text-2xl font-black text-white">{student.label}</h2>
                  {#if student.group}<p class="mt-1 text-sm text-slate-300">{student.group}</p>{/if}
                </div>
                <div class="k-star-orb rounded-2xl bg-emerald-300 px-3 py-2 text-2xl font-black text-slate-950">⭐ {student.total}</div>
              </div>
              <div class="mt-5 grid grid-cols-2 gap-2">
                <button class="k-button-primary min-h-16 text-lg" type="button" disabled={busy || !active(displayState)} aria-label={`Add star for ${student.label}`} onclick={() => add(student.id)}>+ Star</button>
                <button class="k-button-soft min-h-16 text-lg" type="button" disabled={busy || !active(displayState) || student.total <= 0} aria-label={`Remove star from ${student.label}`} onclick={() => remove(student.id)}>− Star</button>
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <div class="k-panel flex min-h-96 items-center justify-center p-8 text-center text-slate-300">
          <div>
            <p class="text-5xl" aria-hidden="true">✦</p>
            <h2 class="mt-4 text-2xl font-black text-white">No session state is available</h2>
            <p class="mt-2">Return to setup to start a local session, or reopen the live teacher link from this browser.</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
</section>
