<script lang="ts">
import { onMount } from "svelte";
import {
  applyStarEvent,
  createBulkStarEventInputs,
  deriveDisplayState,
  endSession,
  reactivateSession,
  resetSession,
  undoLastEvent,
} from "../../lib/domain/session";
import type { ClassroomSession, DisplayState, StarDelta } from "../../lib/domain/types";
import { isTerminalLiveErrorCode } from "../../lib/liveSessionRetry";
import { ACTIVE_SESSION_KEY } from "../../lib/persistence/localTemplateStore";

interface Props {
  mode: "local" | "live";
  sessionId?: string;
  teacherToken?: string;
}

interface CachedLiveSession {
  displayState?: DisplayState;
  displayUrl?: string;
  displayToken?: string;
  expiresAt?: string;
  sessionId?: string;
  teacherToken?: string;
  teacherUrl?: string;
  [key: string]: unknown;
}

interface LiveApiResult {
  ok?: boolean;
  displayState?: DisplayState;
  purged?: boolean;
  code?: string;
  message?: string;
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
const hasRemovableStars = (state: DisplayState | null) =>
  state?.students.some((student) => student.total > 0) ?? false;
const statusLabel = (state: DisplayState | null) =>
  state ? state.status.toUpperCase() : "WAITING";
const cleanupLiveMetadata = () => {
  window.localStorage.removeItem(liveStorageKey());
  displayUrl = "";
};
const shouldClearLiveMetadata = (code: unknown) =>
  code === "EXPIRED" || code === "NOT_FOUND" || code === "PURGED";
const readCachedLiveRecord = () => {
  const raw = window.localStorage.getItem(liveStorageKey());
  if (!raw) return null;
  return JSON.parse(raw) as CachedLiveSession;
};
const displayTokenFromUrl = (url: string | undefined) => {
  if (!url) return "";
  try {
    return new URL(url, window.location.origin).searchParams.get("token") ?? "";
  } catch {
    return "";
  }
};
const displayApiUrlFor = (record: CachedLiveSession | null) => {
  const token = record?.displayToken ?? displayTokenFromUrl(record?.displayUrl ?? displayUrl);
  return token ? `/api/session/${sessionId}/display?token=${encodeURIComponent(token)}` : "";
};
const teacherReadRequest = () =>
  teacherToken
    ? {
        url: `/api/session/${sessionId}/display`,
        init: { headers: { authorization: `Bearer ${teacherToken}` } },
      }
    : null;

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
  let record: CachedLiveSession | null = null;
  try {
    record = readCachedLiveRecord();
  } catch {
    cleanupLiveMetadata();
    message = "Live session metadata was invalid and has been cleaned up.";
    return;
  }
  if (record?.expiresAt && Date.parse(record.expiresAt) <= Date.now()) {
    cleanupLiveMetadata();
    displayState = null;
    message = "Live session metadata expired and has been cleaned up.";
    return;
  }
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
  const record = readCachedLiveRecord() ?? {};
  window.localStorage.setItem(liveStorageKey(), JSON.stringify({ ...record, displayState }));
};

const requestLive = async (path: string, body: unknown = {}) => {
  const response = await fetch(`/api/session/${sessionId}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${teacherToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as LiveApiResult;
  if (!response.ok || !result.ok) {
    if (shouldClearLiveMetadata(result.code)) cleanupLiveMetadata();
    throw new Error(result.message ?? "Live update failed.");
  }
  updateLiveStorage(result);
  return result;
};

const callLive = async (path: string, body: unknown = {}) => {
  busy = true;
  try {
    const result = await requestLive(path, body);
    message = "Live session updated.";
    return result;
  } catch (error) {
    message = error instanceof Error ? error.message : "Live update failed.";
  } finally {
    busy = false;
  }
};

const reconnectLive = async () => {
  if (mode !== "live") return;
  busy = true;
  try {
    let record: CachedLiveSession | null = null;
    try {
      record = readCachedLiveRecord();
    } catch {
      cleanupLiveMetadata();
      displayState = null;
      message = "Live session metadata was invalid and has been cleaned up.";
      return;
    }
    if (record?.expiresAt && Date.parse(record.expiresAt) <= Date.now()) {
      cleanupLiveMetadata();
      displayState = null;
      message = "Live session metadata expired and has been cleaned up.";
      return;
    }
    displayUrl = record?.displayUrl ?? displayUrl;
    const apiUrl = displayApiUrlFor(record);
    const teacherRequest = apiUrl ? null : teacherReadRequest();
    if (!apiUrl && !teacherRequest) {
      message =
        "Reconnect needs the saved display token or teacher link token. Reopen the live teacher link from setup.";
      return;
    }
    const response = await fetch(apiUrl || teacherRequest?.url || "", teacherRequest?.init);
    const result = (await response.json()) as LiveApiResult;
    if (!response.ok || !result.ok) {
      if (isTerminalLiveErrorCode(result.code)) {
        if (result.code === "EXPIRED" || result.code === "NOT_FOUND" || result.code === "PURGED")
          cleanupLiveMetadata();
        displayState = result.displayState ?? null;
      }
      message =
        result.message ??
        (isTerminalLiveErrorCode(result.code)
          ? "The live session is unavailable."
          : "Live reconnect failed. Try again in a moment.");
      return;
    }
    if (result.displayState) updateLiveStorage(result);
    message = teacherRequest
      ? "Live session reconnected from the teacher link. Display link metadata is not saved in this browser."
      : "Live session reconnected.";
  } catch {
    message = "Live reconnect failed. The saved session was kept so you can try again.";
  } finally {
    busy = false;
  }
};

const add = (studentId: string) => {
  if (mode === "local" && session) saveLocal(applyStarEvent(session, { studentId, delta: 1 }));
  else void callLive("event", { studentId, delta: 1 });
};

const remove = (studentId: string) => {
  if (mode === "local" && session) {
    try {
      saveLocal(applyStarEvent(session, { studentId, delta: -1 }));
    } catch (error) {
      message = error instanceof Error ? error.message : "Could not remove star.";
    }
  } else void callLive("event", { studentId, delta: -1 });
};

const batchMessage = (delta: StarDelta, count: number) =>
  `${delta === 1 ? "Added" : "Removed"} 1 star ${
    delta === 1 ? "for" : "from"
  } ${count} ${count === 1 ? "student" : "students"}.`;

const applyLiveBatch = async (
  inputs: Array<{ studentId: string; delta: StarDelta }>,
  delta: StarDelta,
) => {
  // Live sessions still expose single-event writes, so bulk updates are
  // sequential and report partial progress if a later request fails.
  busy = true;
  let completed = 0;
  try {
    for (const input of inputs) {
      await requestLive("event", input);
      completed += 1;
    }
    message = batchMessage(delta, completed);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Live batch update failed.";
    message =
      completed > 0
        ? `${batchMessage(delta, completed)} ${inputs.length - completed} ${
            inputs.length - completed === 1 ? "student was" : "students were"
          } not updated. ${detail}`
        : detail;
  } finally {
    busy = false;
  }
};

const applyAll = (delta: StarDelta) => {
  if (!displayState || !active(displayState)) return;
  const inputs = createBulkStarEventInputs(displayState, delta);
  if (inputs.length === 0) {
    message = delta === -1 ? "No students have stars to remove." : "No students are available.";
    return;
  }
  if (mode === "local") {
    if (!session) {
      message = "No local session found. Return to setup to start one.";
      return;
    }
    try {
      const next = inputs.reduce((current, input) => applyStarEvent(current, input), session);
      saveLocal(next);
      message = batchMessage(delta, inputs.length);
    } catch (error) {
      message = error instanceof Error ? error.message : "Could not update stars.";
    }
    return;
  }
  void applyLiveBatch(inputs, delta);
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
  if (mode === "local" && session) saveLocal(reactivateSession(resetSession(session)));
  else
    message = "Live reset is intentionally not exposed; use undo or end/purge for remote sessions.";
};

const end = () => {
  if (!confirm("End this classroom session?")) return;
  if (mode === "local" && session) saveLocal(endSession(session));
  else
    void callLive("end").then((result) => {
      if (!result?.ok) return;
      cleanupLiveMetadata();
      message = "Live session ended and cleaned up.";
    });
};

const purge = () => {
  if (!confirm("Purge the temporary live session now? The display URL will expire immediately."))
    return;
  void callLive("end?purge=1").then((result) => {
    if (!result?.ok) return;
    cleanupLiveMetadata();
    displayState = null;
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
    <div class="border-b border-[var(--border-soft)] p-5 sm:p-6">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <p class="k-eyebrow">{mode === "live" ? "Live teacher controls" : "Local teacher controls"}</p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">{displayState?.className ?? "Kudos session"}</h1>
          <p class="mt-3 max-w-3xl text-base leading-7 text-[var(--text-soft)]" aria-live="polite">{message}</p>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 lg:w-72 lg:grid-cols-1">
          <a class="k-button-soft" href="/">Setup</a>
          {#if mode === "live"}<button class="k-button-soft" type="button" disabled={busy} onclick={reconnectLive}>Reconnect</button>{/if}
          {#if displayUrl}<a class="k-button-primary" href={displayUrl} target="_blank" rel="noreferrer">Open display</a>{/if}
        </div>
      </div>

      {#if displayState}
        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <div class="k-stat"><p class="k-eyebrow">Status</p><p class="mt-1 text-2xl font-bold">{statusLabel(displayState)}</p></div>
          <div class="k-stat"><p class="k-eyebrow">Students</p><p class="mt-1 text-2xl font-bold">{displayState.students.length}</p></div>
          <div class="k-stat"><p class="k-eyebrow">Total stars</p><p class="mt-1 text-2xl font-bold">⭐ {totalStars(displayState)}</p></div>
        </div>
      {/if}
    </div>

    <div class="grid gap-6 p-5 sm:p-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside class="grid content-start gap-3">
        <section class="k-panel p-4">
          <p class="k-eyebrow">Operations</p>
          <div class="mt-4 grid gap-2">
            {#if mode === "live"}<button class="k-button-soft" type="button" disabled={busy} onclick={reconnectLive}>Reconnect live state</button>{/if}
            <button class="k-button-primary" type="button" disabled={busy || !displayState || !active(displayState)} aria-label="Add one star for all students" onclick={() => applyAll(1)}>+1 star for all</button>
            <button class="k-button-soft" type="button" disabled={busy || !displayState || !active(displayState) || !hasRemovableStars(displayState)} aria-label="Remove one star from all students with stars" onclick={() => applyAll(-1)}>−1 star for all</button>
            <button class="k-button-soft" type="button" disabled={busy || !displayState} onclick={undo}>Undo last star</button>
            <button class="k-button-soft" type="button" disabled={busy || !displayState || mode === "live"} onclick={reset}>Reset local stars</button>
            <button class="k-button-danger" type="button" disabled={busy || !displayState || !active(displayState)} onclick={end}>End session</button>
            {#if mode === "live"}<button class="k-button-danger" type="button" disabled={busy || !displayState} onclick={purge}>Purge live session</button>{/if}
          </div>
        </section>

        <section class="k-panel p-4">
          <p class="k-eyebrow">Display link</p>
          {#if displayUrl}
            <p class="mt-3 break-all rounded-xl border border-cyan-300/20 bg-cyan-300/8 p-3 text-sm leading-6 text-[var(--foreground)]">{displayUrl}</p>
            <button class="k-button-soft mt-3 w-full" type="button" onclick={copyDisplayUrl}>Copy link</button>
          {:else}
            <p class="mt-3 text-sm leading-6 text-[var(--text-soft)]">Start or restore a session to reveal the read-only display link.</p>
          {/if}
        </section>
      </aside>

      {#if displayState}
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {#each displayState.students as student}
            <article class="k-panel-soft p-4" aria-label={`${student.label} has ${student.total} stars`}>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h2 class="truncate text-2xl font-bold text-[var(--foreground)]">{student.label}</h2>
                  {#if student.group}<p class="mt-1 text-sm text-[var(--text-soft)]">{student.group}</p>{/if}
                </div>
                <div class="k-star-orb rounded-xl bg-emerald-300 px-3 py-2 text-2xl font-bold text-slate-950">⭐ {student.total}</div>
              </div>
              <div class="mt-5 grid grid-cols-2 gap-2">
                <button class="k-button-primary min-h-16 text-lg" type="button" disabled={busy || !active(displayState)} aria-label={`Add star for ${student.label}`} onclick={() => add(student.id)}>+ Star</button>
                <button class="k-button-soft min-h-16 text-lg" type="button" disabled={busy || !active(displayState) || student.total <= 0} aria-label={`Remove star from ${student.label}`} onclick={() => remove(student.id)}>− Star</button>
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <div class="k-panel flex min-h-96 items-center justify-center p-8 text-center text-[var(--text-soft)]">
          <div>
            <p class="text-5xl" aria-hidden="true">✦</p>
            <h2 class="mt-4 text-2xl font-bold text-[var(--foreground)]">No session state is available</h2>
            <p class="mt-2">Return to setup to start a local session, or reopen the live teacher link from this browser.</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
</section>
