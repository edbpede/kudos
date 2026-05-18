<script lang="ts">
import { onMount, tick } from "svelte";
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

type SetupStep = "class-roster" | "board-details" | "review-launch";

type SetupStepMeta = {
	id: SetupStep;
	number: string;
	label: string;
	description: string;
	panelId: string;
};

const setupSteps: SetupStepMeta[] = [
	{
		id: "class-roster",
		number: "1",
		label: "Class & roster",
		description: "Choose a template, name the class, and add students.",
		panelId: "setup-step-class-roster",
	},
	{
		id: "board-details",
		number: "2",
		label: "Board details",
		description: "Set rules, goals, rewards, and display preferences.",
		panelId: "setup-step-board-details",
	},
	{
		id: "review-launch",
		number: "3",
		label: "Review & launch",
		description: "Review readiness, launch a session, or move a template.",
		panelId: "setup-step-review-launch",
	},
];

let templates = $state<ClassTemplate[]>([]);
let current = $state<ClassTemplate>(createDefaultTemplate());
let status = $state("Loading local templates…");
let importText = $state("");
let exportText = $state("");
let liveDisplayUrl = $state("");
let busy = $state(false);
let currentStep = $state<SetupStep>("class-roster");
let alphabetizedStudents = $derived(alphabetizeStudents(current.students));
let activeStepIndex = $derived(
	Math.max(
		0,
		setupSteps.findIndex((step) => step.id === currentStep),
	),
);
let activeStep = $derived(setupSteps[activeStepIndex] ?? setupSteps[0]);
let canGoBack = $derived(activeStepIndex > 0);
let canGoNext = $derived(activeStepIndex < setupSteps.length - 1);
let displayNameModeLabel = $derived(
	current.preferences.displayNameMode === "alias"
		? "Aliases when available"
		: current.preferences.displayNameMode === "initials"
			? "Initials"
			: "Display names",
);
let stepFocusTarget = $state<HTMLElement | null>(null);

onMount(() => {
	templates = loadTemplates();
	current = templates[0] ?? createDefaultTemplate();
	exportText = serializeTemplate(current);
	status = "Local templates are saved in this browser only.";
});

const focusStepPanel = async () => {
	await tick();
	stepFocusTarget?.focus();
};

const goToStep = (step: SetupStep) => {
	currentStep = step;
	void focusStepPanel();
};

const goToStepOffset = (offset: number) => {
	const nextIndex = Math.min(
		Math.max(activeStepIndex + offset, 0),
		setupSteps.length - 1,
	);
	goToStep(setupSteps[nextIndex].id);
};

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

<section class="k-card overflow-hidden" aria-labelledby="setup-heading">
  <div class="border-b border-white/10 p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="max-w-2xl">
        <p class="k-eyebrow">Guided setup</p>
        <h2 id="setup-heading" class="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Build your board in 3 steps
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-300">
          Roster, board details, then review and launch.
        </p>
      </div>

      <section class="inline-flex max-w-full items-start gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-2 text-sm leading-5 text-emerald-50" aria-label="Setup status" aria-live="polite">
        <span class="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200/80">Status</span>
        <span>{status}</span>
      </section>
    </div>

    <dl class="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" aria-label="Setup summary">
      <div class="flex items-baseline gap-2">
        <dt class="k-eyebrow">Roster</dt>
        <dd class="font-bold text-white">{current.students.length}</dd>
      </div>
      <div class="flex items-baseline gap-2">
        <dt class="k-eyebrow">Rules</dt>
        <dd class="font-bold text-white">{current.rules.length}</dd>
      </div>
      <div class="flex items-baseline gap-2">
        <dt class="k-eyebrow">Saved</dt>
        <dd class="font-bold text-white">{templates.length}</dd>
      </div>
    </dl>

    <nav class="mt-4" aria-label="Setup steps">
      <ol class="flex flex-wrap gap-2">
        {#each setupSteps as step}
          <li class="min-w-0">
            {#if currentStep === step.id}
              <button class="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-300/14 px-3 py-2 text-left text-sm font-semibold text-white outline-none ring-2 ring-emerald-300/35" type="button" aria-current="step" aria-controls={step.panelId} onclick={() => goToStep(step.id)}>
                <span class="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-300 text-xs font-bold text-slate-950">{step.number}</span>
                <span>{step.label}</span>
                <span class="sr-only">: {step.description}</span>
              </button>
            {:else}
              <button class="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-semibold text-slate-100 outline-none transition hover:border-emerald-300/30 hover:bg-emerald-300/8 focus-visible:ring-2 focus-visible:ring-emerald-300/60" type="button" aria-controls={step.panelId} onclick={() => goToStep(step.id)}>
                <span class="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-slate-100">{step.number}</span>
                <span>{step.label}</span>
                <span class="sr-only">: {step.description}</span>
              </button>
            {/if}
          </li>
        {/each}
      </ol>
    </nav>
  </div>

  <div class="grid gap-6 p-5 sm:p-6">
    {#if currentStep === "class-roster"}
      <section bind:this={stepFocusTarget} id="setup-step-class-roster" class="grid gap-6 outline-none" aria-labelledby="setup-step-class-roster-heading" tabindex="-1">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="k-eyebrow">Step 1 of 3</p>
            <h3 id="setup-step-class-roster-heading" class="mt-1 text-2xl font-bold text-white">Class & roster</h3>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Select a saved template or start fresh, then make the student list fit today’s class.</p>
          </div>
          <button class="k-button-soft" type="button" onclick={newTemplate}>New class</button>
        </div>

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

        <section class="k-panel-soft p-4 sm:p-5" aria-labelledby="students-heading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="k-eyebrow">Students</p>
              <h4 id="students-heading" class="mt-1 text-2xl font-bold text-white">Roster</h4>
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
      </section>
    {:else if currentStep === "board-details"}
      <section bind:this={stepFocusTarget} id="setup-step-board-details" class="grid gap-6 outline-none" aria-labelledby="setup-step-board-details-heading" tabindex="-1">
        <div>
          <p class="k-eyebrow">Step 2 of 3</p>
          <h3 id="setup-step-board-details-heading" class="mt-1 text-2xl font-bold text-white">Board details</h3>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Choose what earns stars, what the class is working toward, and how the board should display.</p>
        </div>

        <div class="grid gap-5 2xl:grid-cols-2">
          <section class="k-panel p-4 sm:p-5" aria-labelledby="rules-heading">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="k-eyebrow">Rules</p>
                <h4 id="rules-heading" class="mt-1 text-2xl font-bold text-white">Positive rules</h4>
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
                <h4 id="goals-heading" class="mt-1 text-2xl font-bold text-white">Goals</h4>
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
                <h4 id="rewards-heading" class="mt-1 text-2xl font-bold text-white">Rewards</h4>
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

          <section class="k-panel p-4 sm:p-5" aria-labelledby="preferences-heading">
            <div>
              <p class="k-eyebrow">Display behavior</p>
              <h4 id="preferences-heading" class="mt-1 text-2xl font-bold text-white">Preferences</h4>
            </div>
            <div class="mt-4 grid gap-3 text-sm text-slate-200">
              <label class="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3"><input type="checkbox" checked={current.preferences.showRules} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, showRules: event.currentTarget.checked } })} /> Show rules</label>
              <label class="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3"><input type="checkbox" checked={current.preferences.showGoals} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, showGoals: event.currentTarget.checked } })} /> Show goals</label>
              <label class="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3"><input type="checkbox" checked={current.preferences.showRewards} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, showRewards: event.currentTarget.checked } })} /> Show rewards</label>
              <label class="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3"><input type="checkbox" checked={current.preferences.reducedMotion} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, reducedMotion: event.currentTarget.checked } })} /> Reduced motion</label>
              <label class="grid gap-2"><span class="k-label">Display names</span><select class="k-input" value={current.preferences.displayNameMode} onchange={(event) => persist({ ...current, preferences: { ...defaultPreferences, ...current.preferences, displayNameMode: event.currentTarget.value as typeof current.preferences.displayNameMode } })}><option value="displayName">Display names</option><option value="alias">Aliases when available</option><option value="initials">Initials</option></select></label>
            </div>
          </section>
        </div>
      </section>
    {:else}
      <section bind:this={stepFocusTarget} id="setup-step-review-launch" class="grid gap-6 outline-none" aria-labelledby="setup-step-review-launch-heading" tabindex="-1">
        <div>
          <p class="k-eyebrow">Step 3 of 3</p>
          <h3 id="setup-step-review-launch-heading" class="mt-1 text-2xl font-bold text-white">Review & launch</h3>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Check the class setup, then launch a session or use import/export for a portable template.</p>
        </div>

        <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section class="k-panel-soft p-4 sm:p-5" aria-labelledby="review-summary-heading">
            <p class="k-eyebrow">Ready check</p>
            <h4 id="review-summary-heading" class="mt-1 text-2xl font-bold text-white">{current.className}</h4>
            <dl class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-white/10 bg-slate-950/35 p-3">
                <dt class="k-eyebrow">Students</dt>
                <dd class="mt-1 text-xl font-bold text-white">{current.students.length}</dd>
              </div>
              <div class="rounded-xl border border-white/10 bg-slate-950/35 p-3">
                <dt class="k-eyebrow">Rules</dt>
                <dd class="mt-1 text-xl font-bold text-white">{current.rules.length}</dd>
              </div>
              <div class="rounded-xl border border-white/10 bg-slate-950/35 p-3">
                <dt class="k-eyebrow">Goals</dt>
                <dd class="mt-1 text-xl font-bold text-white">{current.goals.length}</dd>
              </div>
              <div class="rounded-xl border border-white/10 bg-slate-950/35 p-3">
                <dt class="k-eyebrow">Rewards</dt>
                <dd class="mt-1 text-xl font-bold text-white">{current.rewards.length}</dd>
              </div>
            </dl>
            <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
              <p><span class="font-semibold text-white">Display names:</span> {displayNameModeLabel}</p>
              <p><span class="font-semibold text-white">Visible sections:</span> Rules {current.preferences.showRules ? "on" : "off"}, goals {current.preferences.showGoals ? "on" : "off"}, rewards {current.preferences.showRewards ? "on" : "off"}</p>
              <p><span class="font-semibold text-white">Motion:</span> {current.preferences.reducedMotion ? "Reduced" : "Full"}</p>
            </div>
          </section>

          <section class="k-panel p-4 sm:p-5" aria-labelledby="session-actions-heading">
            <p class="k-eyebrow">Session</p>
            <h4 id="session-actions-heading" class="mt-1 text-2xl font-bold text-white">Launch</h4>
            <p class="mt-3 text-sm leading-6 text-slate-300">Local sessions stay on this device. Live sessions create a teacher URL and a read-only display link.</p>
            <div class="mt-4 grid gap-2">
              <button class="k-button-primary text-base" type="button" onclick={startLocalSession}>Start local session</button>
              <button class="k-button-soft text-base" type="button" disabled={busy} onclick={startLiveSession}>{busy ? "Creating live link…" : "Start live session"}</button>
            </div>
            {#if liveDisplayUrl}
              <a class="mt-3 block break-all rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-3 text-sm font-semibold text-cyan-100 underline" href={liveDisplayUrl}>Read-only display URL</a>
            {/if}
          </section>
        </div>

        <section class="k-panel p-4 sm:p-5" aria-labelledby="portable-template-heading">
          <p class="k-eyebrow">Advanced portable template</p>
          <h4 id="portable-template-heading" class="mt-1 text-2xl font-bold text-white">Import / export</h4>
          <p class="mt-2 text-sm leading-6 text-slate-300">Export includes class setup only—no teacher token, display token, or runtime session secrets.</p>
          <button class="k-button-soft mt-4" type="button" onclick={exportTemplate}>Refresh export JSON</button>
          <textarea aria-label="Exported class JSON" class="k-input k-subtle-scrollbar mt-3 min-h-36 font-mono text-xs" readonly value={exportText}></textarea>
          <textarea aria-label="Import class JSON" class="k-input k-subtle-scrollbar mt-3 min-h-28 font-mono text-xs" placeholder="Paste exported class JSON" bind:value={importText}></textarea>
          <button class="k-button-primary mt-3 w-full" type="button" onclick={importTemplate}>Import JSON</button>
        </section>
      </section>
    {/if}

    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
      <button class="k-button-soft" type="button" disabled={!canGoBack} onclick={() => goToStepOffset(-1)}>Back</button>
      <p class="text-sm font-semibold text-slate-300">Step {activeStep.number} of {setupSteps.length}: {activeStep.label}</p>
      {#if canGoNext}
        <button class="k-button-primary" type="button" onclick={() => goToStepOffset(1)}>Next</button>
      {:else}
        <button class="k-button-soft" type="button" onclick={() => goToStep("class-roster")}>Back to step 1</button>
      {/if}
    </div>
  </div>
</section>
