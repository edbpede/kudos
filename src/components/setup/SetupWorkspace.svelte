<script lang="ts">
import { onMount } from "svelte";
import {
	createDefaultTemplate,
	defaultPreferences,
} from "../../lib/domain/defaults";
import { createPrefixedId } from "../../lib/domain/ids";
import {
	alphabetizeStudents,
	createSessionFromTemplate,
} from "../../lib/domain/session";
import type {
	ClassTemplate,
	Goal,
	Reward,
	Rule,
	Student,
} from "../../lib/domain/types";
import {
	parseTemplateJson,
	serializeTemplate,
} from "../../lib/persistence/jsonImportExport";
import {
	ACTIVE_SESSION_KEY,
	loadTemplates,
	saveTemplates,
} from "../../lib/persistence/localTemplateStore";

let templates = $state<ClassTemplate[]>([]);
let current = $state<ClassTemplate>(createDefaultTemplate());
let status = $state("Loading local templates…");
let importText = $state("");
let exportText = $state("");
let liveDisplayUrl = $state("");
let busy = $state(false);
let alphabetizedStudents = $derived(alphabetizeStudents(current.students));

onMount(() => {
	templates = loadTemplates();
	current = templates[0] ?? createDefaultTemplate();
	exportText = serializeTemplate(current);
	status = "Local templates are saved in this browser only.";
});

const touch = (template: ClassTemplate): ClassTemplate => ({
	...template,
	updatedAt: new Date().toISOString(),
});

const persist = (template = current) => {
	current = touch(template);
	templates = templates.some((item) => item.id === current.id)
		? templates.map((item) => (item.id === current.id ? current : item))
		: [...templates, current];
	saveTemplates(templates);
	exportText = serializeTemplate(current);
	status = "Saved locally in this browser.";
};

const selectTemplate = (id: string) => {
	const found = templates.find((template) => template.id === id);
	if (found) {
		current = structuredClone(found);
		exportText = serializeTemplate(current);
		status = `Loaded ${current.className}.`;
	}
};

const newTemplate = () => {
	const next = createDefaultTemplate();
	next.className = "New class";
	persist(next);
};

const addStudent = () => {
	const student: Student = {
		id: createPrefixedId("student"),
		displayName: `Student ${current.students.length + 1}`,
		order: current.students.length,
	};
	persist({ ...current, students: [...current.students, student] });
};

const updateStudent = (id: string, patch: Partial<Student>) => {
	persist({
		...current,
		students: current.students.map((student) =>
			student.id === id ? { ...student, ...patch } : student,
		),
	});
};

const removeStudent = (id: string) => {
	if (current.students.length <= 1) {
		status = "Keep at least one student in a class.";
		return;
	}
	persist({
		...current,
		students: current.students
			.filter((student) => student.id !== id)
			.map((student, order) => ({ ...student, order })),
	});
};

const addRule = () =>
	persist({
		...current,
		rules: [
			...current.rules,
			{
				id: createPrefixedId("rule"),
				label: "Positive classroom behavior",
				stars: 1,
			},
		],
	});
const updateRule = (id: string, patch: Partial<Rule>) =>
	persist({
		...current,
		rules: current.rules.map((rule) =>
			rule.id === id ? { ...rule, ...patch } : rule,
		),
	});
const removeRule = (id: string) => {
	if (current.rules.length <= 1) {
		status = "Keep at least one positive rule.";
		return;
	}

	persist({
		...current,
		rules: current.rules.filter((rule) => rule.id !== id),
	});
};

const addGoal = () =>
	persist({
		...current,
		goals: [
			...current.goals,
			{ id: createPrefixedId("goal"), title: "Today’s focus" },
		],
	});
const updateGoal = (id: string, patch: Partial<Goal>) =>
	persist({
		...current,
		goals: current.goals.map((goal) =>
			goal.id === id ? { ...goal, ...patch } : goal,
		),
	});
const removeGoal = (id: string) =>
	persist({
		...current,
		goals: current.goals.filter((goal) => goal.id !== id),
	});

const addReward = () =>
	persist({
		...current,
		rewards: [
			...current.rewards,
			{ id: createPrefixedId("reward"), title: "Class choice" },
		],
	});
const updateReward = (id: string, patch: Partial<Reward>) =>
	persist({
		...current,
		rewards: current.rewards.map((reward) =>
			reward.id === id ? { ...reward, ...patch } : reward,
		),
	});
const removeReward = (id: string) =>
	persist({
		...current,
		rewards: current.rewards.filter((reward) => reward.id !== id),
	});

const exportTemplate = () => {
	exportText = serializeTemplate(current);
	void navigator.clipboard?.writeText(exportText)?.catch(() => undefined);
	status =
		"Export JSON refreshed. It contains no live tokens or runtime session data.";
};

const importTemplate = () => {
	const parsed = parseTemplateJson(importText);
	if (!parsed.ok) {
		status = parsed.issues?.join(" ") ?? parsed.message;
		return;
	}
	persist(parsed.value);
	importText = "";
	status = `Imported ${parsed.value.className}.`;
};

const startLocalSession = () => {
	const session = createSessionFromTemplate(current, "local");
	window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
	window.location.href = "/local/session";
};

const startLiveSession = async () => {
	busy = true;
	liveDisplayUrl = "";
	try {
		const response = await fetch("/api/session/create", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ template: current }),
		});
		const body = await response.json();
		if (!response.ok || !body.ok)
			throw new Error(body.message ?? "Could not create live session.");
		window.localStorage.setItem(
			`kudos.live.${body.sessionId}`,
			JSON.stringify(body),
		);
		liveDisplayUrl = body.displayUrl;
		status =
			"Live session created. Teacher token is kept in this browser; display link is read-only.";
		window.location.href = body.teacherUrl;
	} catch (error) {
		status =
			error instanceof Error ? error.message : "Could not create live session.";
	} finally {
		busy = false;
	}
};
</script>

<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
  <section class="k-card overflow-hidden" aria-labelledby="setup-heading">
    <div class="border-b border-white/10 p-5 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="max-w-3xl">
          <p class="k-eyebrow">Teacher setup</p>
          <h1 id="setup-heading" class="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Build today’s <span class="k-aurora-wordmark text-emerald-200">Kudos</span> board
          </h1>
          <p class="mt-3 text-base leading-7 text-slate-300">
            Set the roster, goals, rewards, and display preferences before starting a local board or temporary live session.
          </p>
        </div>
        <div class="grid min-w-56 gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <button class="k-button-soft" type="button" onclick={newTemplate}>New class</button>
          <button class="k-button-primary" type="button" onclick={startLocalSession}>Start local</button>
        </div>
      </div>

      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="k-stat">
          <p class="k-eyebrow">Roster</p>
          <p class="mt-1 text-2xl font-bold">{current.students.length}</p>
        </div>
        <div class="k-stat">
          <p class="k-eyebrow">Rules</p>
          <p class="mt-1 text-2xl font-bold">{current.rules.length}</p>
        </div>
        <div class="k-stat">
          <p class="k-eyebrow">Saved</p>
          <p class="mt-1 truncate text-2xl font-bold">{templates.length}</p>
        </div>
      </div>
    </div>

    <div class="grid gap-6 p-5 sm:p-6">
      <section class="grid gap-4 md:grid-cols-2" aria-label="Template identity">
        <label class="grid gap-2">
          <span class="k-label">Saved templates</span>
          <select class="k-input" value={current.id} onchange={(event) => selectTemplate(event.currentTarget.value)}>
            {#each templates as template}
              <option value={template.id}>{template.className}</option>
            {/each}
          </select>
        </label>
        <label class="grid gap-2">
          <span class="k-label">Class name</span>
          <input class="k-input text-lg font-semibold" value={current.className} oninput={(event) => persist({ ...current, className: event.currentTarget.value })} />
        </label>
      </section>

      <div class="grid gap-5 2xl:grid-cols-2">
        <section class="k-panel-soft p-4 sm:p-5" aria-labelledby="students-heading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="k-eyebrow">Students</p>
              <h2 id="students-heading" class="mt-1 text-2xl font-bold text-white">Roster</h2>
            </div>
            <button class="k-button-primary" type="button" onclick={addStudent}>Add student</button>
          </div>
          <div class="k-subtle-scrollbar mt-4 grid max-h-[34rem] gap-3 overflow-auto pr-1">
            {#each alphabetizedStudents as student, index (student.id)}
              <div class="grid gap-2 rounded-xl border border-white/10 bg-slate-950/35 p-3 md:grid-cols-[3rem_1fr_1fr_auto] md:items-center">
                <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300/12 font-semibold text-emerald-100">{index + 1}</div>
                <input aria-label="Student display name" class="k-input" value={student.displayName} oninput={(event) => updateStudent(student.id, { displayName: event.currentTarget.value })} />
                <input aria-label="Student alias or group" class="k-input" placeholder="Optional alias/group" value={student.alias ?? ""} oninput={(event) => updateStudent(student.id, { alias: event.currentTarget.value })} />
                <button class="k-button-soft" type="button" onclick={() => removeStudent(student.id)}>Remove</button>
              </div>
            {/each}
          </div>
        </section>

        <section class="k-panel p-4 sm:p-5" aria-labelledby="rules-heading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="k-eyebrow">Rules</p>
              <h2 id="rules-heading" class="mt-1 text-2xl font-bold text-white">Positive rules</h2>
            </div>
            <button class="k-button-soft" type="button" onclick={addRule}>Add rule</button>
          </div>
          <div class="mt-4 grid gap-3">
            {#each current.rules as rule}
              <div class="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-[1fr_6rem_auto]">
                <input aria-label="Rule label" class="k-input" value={rule.label} oninput={(event) => updateRule(rule.id, { label: event.currentTarget.value })} />
                <input aria-label="Rule stars" class="k-input" type="number" min="1" value={rule.stars} oninput={(event) => updateRule(rule.id, { stars: Number(event.currentTarget.value) || 1 })} />
                <button class="k-button-soft" type="button" onclick={() => removeRule(rule.id)}>Remove</button>
              </div>
            {/each}
          </div>
        </section>

        <section class="k-panel p-4 sm:p-5" aria-labelledby="goals-heading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="k-eyebrow">Goals</p>
              <h2 id="goals-heading" class="mt-1 text-2xl font-bold text-white">Goals</h2>
            </div>
            <button class="k-button-soft" type="button" onclick={addGoal}>Add goal</button>
          </div>
          <div class="mt-4 grid gap-3">
            {#each current.goals as goal}
              <div class="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-[1fr_7rem_auto]">
                <input aria-label="Goal title" class="k-input" value={goal.title} oninput={(event) => updateGoal(goal.id, { title: event.currentTarget.value })} />
                <input aria-label="Goal target" class="k-input" type="number" min="1" value={goal.targetStars ?? ""} oninput={(event) => updateGoal(goal.id, { targetStars: Number(event.currentTarget.value) || undefined })} />
                <button class="k-button-soft" type="button" onclick={() => removeGoal(goal.id)}>Remove</button>
              </div>
            {/each}
          </div>
        </section>

        <section class="k-panel p-4 sm:p-5" aria-labelledby="rewards-heading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="k-eyebrow">Rewards</p>
              <h2 id="rewards-heading" class="mt-1 text-2xl font-bold text-white">Rewards</h2>
            </div>
            <button class="k-button-soft" type="button" onclick={addReward}>Add reward</button>
          </div>
          <div class="mt-4 grid gap-3">
            {#each current.rewards as reward}
              <div class="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-[1fr_7rem_auto]">
                <input aria-label="Reward title" class="k-input" value={reward.title} oninput={(event) => updateReward(reward.id, { title: event.currentTarget.value })} />
                <input aria-label="Reward cost" class="k-input" type="number" min="1" value={reward.costStars ?? ""} oninput={(event) => updateReward(reward.id, { costStars: Number(event.currentTarget.value) || undefined })} />
                <button class="k-button-soft" type="button" onclick={() => removeReward(reward.id)}>Remove</button>
              </div>
            {/each}
          </div>
        </section>
      </div>
    </div>
  </section>

  <aside class="grid content-start gap-4">
    <section class="k-card p-5" aria-live="polite">
      <p class="k-eyebrow">Session</p>
      <h2 class="mt-1 text-2xl font-bold text-white">Session actions</h2>
      <p class="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-300/8 p-3 text-sm leading-6 text-emerald-50">{status}</p>
      <div class="mt-4 grid gap-2">
        <button class="k-button-primary text-base" type="button" onclick={startLocalSession}>Start local session</button>
        <button class="k-button-soft text-base" type="button" disabled={busy} onclick={startLiveSession}>{busy ? "Creating live link…" : "Start live session"}</button>
      </div>
      {#if liveDisplayUrl}
        <a class="mt-3 block break-all rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-3 text-sm font-semibold text-cyan-100 underline" href={liveDisplayUrl}>Read-only display URL</a>
      {/if}
    </section>

    <section class="k-card p-5">
      <p class="k-eyebrow">Display behavior</p>
      <h2 class="mt-1 text-2xl font-bold text-white">Preferences</h2>
      <div class="mt-4 grid gap-3 text-sm text-slate-200">
        <label class="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3"><input type="checkbox" checked={current.preferences.showRules} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, showRules: event.currentTarget.checked } })} /> Show rules</label>
        <label class="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3"><input type="checkbox" checked={current.preferences.showGoals} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, showGoals: event.currentTarget.checked } })} /> Show goals</label>
        <label class="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3"><input type="checkbox" checked={current.preferences.showRewards} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, showRewards: event.currentTarget.checked } })} /> Show rewards</label>
        <label class="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3"><input type="checkbox" checked={current.preferences.reducedMotion} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, reducedMotion: event.currentTarget.checked } })} /> Reduced motion</label>
        <label class="grid gap-2"><span class="k-label">Display names</span><select class="k-input" value={current.preferences.displayNameMode} onchange={(event) => persist({ ...current, preferences: { ...defaultPreferences, ...current.preferences, displayNameMode: event.currentTarget.value as typeof current.preferences.displayNameMode } })}><option value="displayName">Display names</option><option value="alias">Aliases when available</option><option value="initials">Initials</option></select></label>
      </div>
    </section>

    <section class="k-card p-5">
      <p class="k-eyebrow">Portable template</p>
      <h2 class="mt-1 text-2xl font-bold text-white">Import / export</h2>
      <p class="mt-2 text-sm leading-6 text-slate-300">Export includes class setup only—no teacher token, display token, or runtime session secrets.</p>
      <button class="k-button-soft mt-4" type="button" onclick={exportTemplate}>Refresh export JSON</button>
      <textarea aria-label="Exported class JSON" class="k-input k-subtle-scrollbar mt-3 min-h-36 font-mono text-xs" readonly value={exportText}></textarea>
      <textarea aria-label="Import class JSON" class="k-input k-subtle-scrollbar mt-3 min-h-28 font-mono text-xs" placeholder="Paste exported class JSON" bind:value={importText}></textarea>
      <button class="k-button-primary mt-3 w-full" type="button" onclick={importTemplate}>Import JSON</button>
    </section>
  </aside>
</div>
