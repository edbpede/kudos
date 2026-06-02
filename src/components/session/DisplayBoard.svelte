<script lang="ts">
import { onMount } from "svelte";
import { deriveDisplayState } from "../../lib/domain/session";
import type { ClassroomSession, DisplayState } from "../../lib/domain/types";
import {
	liveRetryDecision,
	nextLivePollDelayMs,
} from "../../lib/liveSessionRetry";
import { ACTIVE_SESSION_KEY } from "../../lib/persistence/localTemplateStore";

interface Props {
	mode: "local" | "live";
	sessionId?: string;
	displayToken?: string;
}

let { mode, sessionId = "", displayToken = "" }: Props = $props();
let displayState = $state<DisplayState | null>(null);
let message = $state("Connecting to display state…");
let reconnecting = $state(false);
let localTimer: ReturnType<typeof setInterval> | undefined;
let liveTimer: ReturnType<typeof setTimeout> | undefined;
let liveInFlight = false;
let liveStopped = false;
let liveFailureCount = 0;
let unmounted = false;

const totalStars = (state: DisplayState) =>
	state.students.reduce((sum, student) => sum + student.total, 0);
const topTotal = (state: DisplayState) =>
	Math.max(0, ...state.students.map((student) => student.total));
const formatRuleStars = (stars: number) => `${stars > 0 ? "+" : ""}${stars}`;
const gridMin = (state: DisplayState) => {
	if (state.students.length > 45) return "7rem";
	if (state.students.length > 35) return "8.5rem";
	return "12rem";
};
const liveDisplayApiUrl = () =>
	`/api/session/${sessionId}/display?token=${encodeURIComponent(displayToken)}`;
const formatDelay = (delayMs: number) =>
	`${Math.max(1, Math.ceil(delayMs / 1000))} second${
		Math.ceil(delayMs / 1000) === 1 ? "" : "s"
	}`;

interface DisplayApiResult {
	ok?: boolean;
	code?: string;
	message?: string;
	displayState?: DisplayState;
}

const loadLocal = () => {
	const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY);
	if (!raw) {
		message = "No local display session found.";
		return;
	}
	displayState = deriveDisplayState(JSON.parse(raw) as ClassroomSession);
	message = "Local display ready.";
};

const clearLiveTimer = () => {
	if (!liveTimer) return;
	clearTimeout(liveTimer);
	liveTimer = undefined;
};

const scheduleLive = (delayMs: number) => {
	if (unmounted || liveStopped) return;
	clearLiveTimer();
	liveTimer = setTimeout(() => void loadLive(), delayMs);
};

const loadLive = async (manual = false) => {
	if (liveInFlight) {
		if (manual) message = "Reconnect is already in progress…";
		return;
	}
	liveInFlight = true;
	reconnecting = manual;
	let nextDelayMs: number | null = null;
	try {
		const response = await fetch(liveDisplayApiUrl());
		const body = (await response.json()) as DisplayApiResult;
		if (unmounted) return;
		if (body.displayState) displayState = body.displayState;
		if (!response.ok || !body.ok) {
			const decision = liveRetryDecision({
				code: body.code,
				failureCount: liveFailureCount + 1,
			});
			if (!decision.retry) {
				liveStopped = true;
				liveFailureCount = 0;
				message = body.message ?? "The live session is unavailable.";
				return;
			}
			liveFailureCount = decision.failureCount;
			nextDelayMs = decision.delayMs;
			message = `${
				body.message ?? "Live display is temporarily unavailable."
			} Reconnecting in ${formatDelay(nextDelayMs)}…`;
			return;
		}
		liveFailureCount = 0;
		liveStopped = false;
		nextDelayMs = nextLivePollDelayMs(
			body.displayState?.preferences.pollIntervalMs,
		);
		message = manual ? "Live display reconnected." : "Live display connected.";
	} catch {
		if (unmounted) return;
		const decision = liveRetryDecision({
			failureCount: liveFailureCount + 1,
		});
		if (!decision.retry) return;
		liveFailureCount = decision.failureCount;
		nextDelayMs = decision.delayMs;
		message = `Connection lost. Reconnecting in ${formatDelay(nextDelayMs)}…`;
	} finally {
		liveInFlight = false;
		if (!unmounted) reconnecting = false;
		if (!unmounted && !liveStopped && nextDelayMs !== null)
			scheduleLive(nextDelayMs);
	}
};

const reconnectLive = () => {
	if (mode !== "live") return;
	clearLiveTimer();
	liveStopped = false;
	liveFailureCount = 0;
	void loadLive(true);
};

onMount(() => {
	if (mode === "local") {
		loadLocal();
		localTimer = setInterval(loadLocal, 750);
	} else {
		void loadLive();
	}

	return () => {
		unmounted = true;
		if (localTimer) clearInterval(localTimer);
		clearLiveTimer();
	};
});
</script>

<section class="min-h-screen px-3 py-4 sm:px-6 sm:py-6" class:motion-safe={!displayState?.preferences.reducedMotion}>
  <div class="mx-auto max-w-[100rem]">
    <header class="k-card p-5 text-center sm:p-7">
      <div>
        <p class="k-eyebrow">Kudos board</p>
        <h1 class="mt-2 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">{displayState?.className ?? "Classroom Kudos"}</h1>
        <p class="mt-3 text-lg leading-7 text-[var(--text-soft)]" aria-live="polite">{message}</p>
        {#if mode === "live"}
          <button class="k-button-soft mt-4" type="button" disabled={reconnecting} onclick={reconnectLive}>{reconnecting ? "Reconnecting…" : "Reconnect now"}</button>
        {/if}
      </div>
      {#if displayState}
        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <div class="k-stat"><p class="k-eyebrow">Status</p><p class="mt-1 text-3xl font-bold">{displayState.status.toUpperCase()}</p></div>
          <div class="k-stat"><p class="k-eyebrow">Students</p><p class="mt-1 text-3xl font-bold">{displayState.students.length}</p></div>
          <div class="k-stat"><p class="k-eyebrow">Total stars</p><p class="mt-1 text-3xl font-bold">⭐ {totalStars(displayState)}</p></div>
        </div>
      {/if}
    </header>

    {#if displayState?.status === "expired" || displayState?.status === "purged"}
      <div class="k-card mt-6 p-10 text-center">
        <p class="text-6xl" aria-hidden="true">☾</p>
        <h2 class="mt-4 text-3xl font-bold text-[var(--foreground)]">This display link has expired</h2>
        <p class="mx-auto mt-3 max-w-2xl text-lg leading-8 text-[var(--text-soft)]">Ask the teacher to start a new live session. No roster data is shown after expiry or purge.</p>
      </div>
    {:else if displayState}
      <div class="mt-6 grid gap-3 sm:gap-4" style={`grid-template-columns: repeat(auto-fit, minmax(${gridMin(displayState)}, 1fr));`}>
        {#each displayState.students as student (student.id)}
          <article class="k-panel-soft overflow-hidden p-3 text-center sm:p-4" aria-label={`${student.label}: ${student.total} stars`}>
            <h2 class="truncate text-2xl font-bold text-[var(--foreground)] sm:text-3xl">{student.label}</h2>
            <div class="k-star-orb mt-3 rounded-xl border border-emerald-100/20 bg-emerald-300 px-2 py-4 text-4xl font-bold text-slate-950 sm:text-5xl" class:k-celebrate={!displayState.preferences.reducedMotion && student.lastPositiveAt === displayState.updatedAt}>
              <span aria-hidden="true">⭐</span> {student.total}
            </div>
            {#if student.total === topTotal(displayState) && student.total > 0}
              <p class="mt-3 rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">Leading</p>
            {/if}
          </article>
        {/each}
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-3">
        {#if displayState.rules.length}
          <section class="k-card p-5"><p class="k-eyebrow">Classroom rules</p><ul class="mt-3 grid gap-2 text-lg leading-8 text-[var(--text-soft)]">{#each displayState.rules as rule}<li class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3">{formatRuleStars(rule.stars)} · {rule.label}</li>{/each}</ul></section>
        {/if}
        {#if displayState.goals.length}
          <section class="k-card p-5"><p class="k-eyebrow">Today’s focus</p><ul class="mt-3 grid gap-2 text-lg leading-8 text-[var(--text-soft)]">{#each displayState.goals as goal}<li class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3">{goal.title}</li>{/each}</ul></section>
        {/if}
        {#if displayState.rewards.length}
          <section class="k-card p-5"><p class="k-eyebrow">Class rewards</p><ul class="mt-3 grid gap-2 text-lg leading-8 text-[var(--text-soft)]">{#each displayState.rewards as reward}<li class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3">{reward.title}</li>{/each}</ul></section>
        {/if}
      </div>
    {:else}
      <div class="k-card mt-6 p-10 text-center text-[var(--text-soft)]">
        <p class="text-6xl" aria-hidden="true">✦</p>
        <h2 class="mt-4 text-3xl font-bold text-[var(--foreground)]">Waiting for session state…</h2>
        <p class="mx-auto mt-3 max-w-2xl text-lg leading-8">The board will light up as soon as a teacher starts or reconnects a session.</p>
      </div>
    {/if}
  </div>
</section>
