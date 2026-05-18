<script lang="ts">
import { onMount } from "svelte";
import { deriveDisplayState } from "../../lib/domain/session";
import type { ClassroomSession, DisplayState } from "../../lib/domain/types";
import { ACTIVE_SESSION_KEY } from "../../lib/persistence/localTemplateStore";

interface Props {
	mode: "local" | "live";
	sessionId?: string;
	displayToken?: string;
}

let { mode, sessionId = "", displayToken = "" }: Props = $props();
let displayState = $state<DisplayState | null>(null);
let message = $state("Connecting to display state…");
let timer: ReturnType<typeof setInterval> | undefined;

const loadLocal = () => {
	const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY);
	if (!raw) {
		message = "No local display session found.";
		return;
	}
	displayState = deriveDisplayState(JSON.parse(raw) as ClassroomSession);
	message = "Local display ready.";
};

const loadLive = async () => {
	try {
		const response = await fetch(
			`/api/session/${sessionId}/display?token=${encodeURIComponent(displayToken)}`,
		);
		const body = await response.json();
		if (body.displayState) displayState = body.displayState;
		if (!response.ok || !body.ok) {
			message = body.message ?? "The live session is unavailable.";
			return;
		}
		message = "Live display connected.";
	} catch {
		message = "Reconnecting to live display…";
	}
};

onMount(() => {
	if (mode === "local") {
		loadLocal();
		timer = setInterval(loadLocal, 750);
	} else {
		void loadLive();
		timer = setInterval(
			() => void loadLive(),
			displayState?.preferences.pollIntervalMs ?? 1200,
		);
	}

	return () => {
		if (timer) clearInterval(timer);
	};
});
</script>

<section class="min-h-screen p-4 sm:p-6" class:motion-safe={!displayState?.preferences.reducedMotion}>
  <div class="mx-auto max-w-7xl">
    <header class="k-card p-5 text-center">
      <p class="text-sm font-semibold uppercase tracking-wide text-amber-700">Kudos board</p>
      <h1 class="mt-1 text-4xl font-black text-slate-950 sm:text-6xl">{displayState?.className ?? "Classroom Kudos"}</h1>
      <p class="mt-2 text-slate-700" aria-live="polite">{message}</p>
    </header>

    {#if displayState?.status === "expired" || displayState?.status === "purged"}
      <div class="k-card mt-6 p-10 text-center">
        <h2 class="text-3xl font-black">This display link has expired</h2>
        <p class="mt-3 text-slate-700">Ask the teacher to start a new live session. No roster data is shown after expiry.</p>
      </div>
    {:else if displayState}
      <div class="mt-6 grid gap-4" style={`grid-template-columns: repeat(auto-fit, minmax(${displayState.students.length > 35 ? "8rem" : "11rem"}, 1fr));`}>
        {#each displayState.students as student (student.id)}
          <article class="k-card overflow-hidden p-4 text-center" aria-label={`${student.label}: ${student.total} stars`}>
            <h2 class="truncate text-2xl font-black text-slate-950">{student.label}</h2>
            <div class="mt-3 rounded-3xl bg-amber-100 py-4 text-5xl font-black text-amber-900" class:animate-pulse={!displayState.preferences.reducedMotion && student.lastPositiveAt === displayState.updatedAt}>⭐ {student.total}</div>
          </article>
        {/each}
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-3">
        {#if displayState.rules.length}
          <section class="k-card p-5"><h2 class="font-black">Positive rules</h2><ul class="mt-2 list-disc pl-5 text-slate-700">{#each displayState.rules as rule}<li>{rule.label}</li>{/each}</ul></section>
        {/if}
        {#if displayState.goals.length}
          <section class="k-card p-5"><h2 class="font-black">Today’s focus</h2><ul class="mt-2 list-disc pl-5 text-slate-700">{#each displayState.goals as goal}<li>{goal.title}</li>{/each}</ul></section>
        {/if}
        {#if displayState.rewards.length}
          <section class="k-card p-5"><h2 class="font-black">Class rewards</h2><ul class="mt-2 list-disc pl-5 text-slate-700">{#each displayState.rewards as reward}<li>{reward.title}</li>{/each}</ul></section>
        {/if}
      </div>
    {:else}
      <div class="k-card mt-6 p-10 text-center text-slate-700">Waiting for session state…</div>
    {/if}
  </div>
</section>
