<script lang="ts">
import { onMount, tick } from "svelte";
import { createDefaultTemplate, defaultPreferences } from "../../lib/domain/defaults";
import { createPrefixedId } from "../../lib/domain/ids";
import { alphabetizeStudents, createSessionFromTemplate } from "../../lib/domain/session";
import type { ClassTemplate, Goal, Reward, Rule, Student } from "../../lib/domain/types";
import { parseTemplateJson, serializeTemplate } from "../../lib/persistence/jsonImportExport";
import {
  ACTIVE_SESSION_KEY,
  loadTemplates,
  saveTemplates,
} from "../../lib/persistence/localTemplateStore";
import { classTemplateSchema } from "../../lib/validation/schemas";

type SetupStep = "class-roster" | "board-details" | "review-launch";
type Language = "da" | "en";
type Theme = "light" | "dark";

type SetupStepMeta = {
  id: SetupStep;
  number: string;
  label: string;
  title: string;
  description: string;
  panelId: string;
};

type RulePreset = Pick<Rule, "label" | "description" | "stars">;

type Copy = {
  languageName: string;
  themeLight: string;
  themeDark: string;
  heroEyebrow: string;
  heroTitle: string;
  heroText: string;
  statusLabel: string;
  studentsLabel: string;
  rulesLabel: string;
  savedLabel: string;
  newClass: string;
  setupTitle: string;
  setupText: string;
  steps: Record<SetupStep, { label: string; description: string; title: string }>;
  startFreshTitle: string;
  startFreshText: string;
  startFreshButton: string;
  importTitle: string;
  importText: string;
  continueButton: string;
  importPlaceholder: string;
  importButton: string;
  savedTemplates: string;
  className: string;
  studentsTitle: string;
  studentsText: string;
  bulkLabel: string;
  bulkPlaceholder: string;
  bulkButton: string;
  addStudent: string;
  studentName: string;
  studentAlias: string;
  remove: string;
  boardDetailsText: string;
  presetTitle: string;
  presetText: string;
  addPreset: string;
  customRule: string;
  ruleLabel: string;
  ruleStars: string;
  goalsTitle: string;
  addGoal: string;
  goalTitle: string;
  goalTarget: string;
  rewardsTitle: string;
  addReward: string;
  rewardTitle: string;
  rewardCost: string;
  preferencesTitle: string;
  showRules: string;
  showGoals: string;
  showRewards: string;
  reducedMotion: string;
  displayNames: string;
  displayNameOptions: Record<"displayName" | "alias" | "initials", string>;
  reviewTitle: string;
  reviewText: string;
  readyCheck: string;
  visibleSections: string;
  motion: string;
  fullMotion: string;
  reduced: string;
  sessionTitle: string;
  sessionText: string;
  startLocal: string;
  startLive: string;
  creatingLive: string;
  liveReady: string;
  displayUrl: string;
  openTeacher: string;
  portableTitle: string;
  portableText: string;
  refreshExport: string;
  importLabel: string;
  back: string;
  next: string;
  backToStep1: string;
  stepCounter: string;
  privacyTitle: string;
  privacyText: string;
  privacyItems: { title: string; text: string }[];
  statuses: {
    loading: string;
    localOnly: string;
    saved: string;
    loaded: (name: string) => string;
    imported: (name: string) => string;
    keepStudent: string;
    keepRule: string;
    exportRefreshed: string;
    liveCreated: string;
    liveFailed: string;
    noNames: string;
    addedStudents: (count: number) => string;
    ruleAdded: (label: string) => string;
  };
  rulePresets: RulePreset[];
};

const THEME_STORAGE_KEY = "kudos.theme";
const LANGUAGE_STORAGE_KEY = "kudos.language";

const copy: Record<Language, Copy> = {
  da: {
    languageName: "Dansk",
    themeLight: "Lys",
    themeDark: "Mørk",
    heroEyebrow: "Kudos til klasseværelset",
    heroTitle: "Klar til timen på få minutter.",
    heroText: "Vælg bare: start en ny klasse, eller fortsæt med en du har gemt før.",
    statusLabel: "Status",
    studentsLabel: "Elever",
    rulesLabel: "Regler",
    savedLabel: "Gemte",
    newClass: "Ny klasse",
    setupTitle: "Tre hurtige trin",
    setupText: "Gør kun det nødvendige nu. Du kan rette resten senere.",
    steps: {
      "class-roster": {
        label: "Vælg klasse",
        description: "Ny klasse eller import.",
        title: "1. Vælg klasse",
      },
      "board-details": {
        label: "Regler",
        description: "Vælg det vigtigste.",
        title: "2. Vælg enkle regler",
      },
      "review-launch": {
        label: "Start",
        description: "Sidste trin før klassen ser tavlen.",
        title: "3. Start for klassen",
      },
    },
    startFreshTitle: "Start ny klasse",
    startFreshText: "Til en ny klasse. Du kan nøjes med navnene og starte hurtigt.",
    startFreshButton: "Start ny",
    importTitle: "Fortsæt fra før",
    importText:
      "Vælg en gemt klasse på denne computer, eller importér en klasse du har gemt fra før.",
    continueButton: "Fortsæt / importér",
    importPlaceholder: "Indsæt din eksporterede klasse her",
    importButton: "Importér",
    savedTemplates: "Gemte klasser",
    className: "Klassenavn",
    studentsTitle: "Elever",
    studentsText: "Skriv navnene ind. Resten kan vente til senere.",
    bulkLabel: "Tilføj flere elever",
    bulkPlaceholder: "Anna\nMalthe\nSofia",
    bulkButton: "Tilføj navne",
    addStudent: "Tilføj én elev",
    studentName: "Elevnavn",
    studentAlias: "Kaldenavn/gruppe",
    remove: "Fjern",
    boardDetailsText: "Vælg få regler, så tavlen er nem at forklare for klassen.",
    presetTitle: "Regelforslag",
    presetText: "Tilføj kun de regler, du vil bruge i dag.",
    addPreset: "Tilføj",
    customRule: "Tilføj egen regel",
    ruleLabel: "Regeltekst",
    ruleStars: "Stjerner",
    goalsTitle: "Mål",
    addGoal: "Tilføj mål",
    goalTitle: "Måltekst",
    goalTarget: "Mål",
    rewardsTitle: "Belønninger",
    addReward: "Tilføj belønning",
    rewardTitle: "Belønning",
    rewardCost: "Pris",
    preferencesTitle: "Visning",
    showRules: "Vis regler",
    showGoals: "Vis mål",
    showRewards: "Vis belønninger",
    reducedMotion: "Roligere bevægelser",
    displayNames: "Navne på tavlen",
    displayNameOptions: {
      displayName: "Elevnavne",
      alias: "Kaldenavne hvis de findes",
      initials: "Initialer",
    },
    reviewTitle: "Sidste trin: start tavlen",
    reviewText: "Tjek hurtigt, og vælg hvordan klassen skal se tavlen.",
    readyCheck: "Klar til klassen",
    visibleSections: "Synlige felter",
    motion: "Bevægelse",
    fullMotion: "Normal",
    reduced: "Rolig",
    sessionTitle: "Start tavlen",
    sessionText:
      "Vælg lokal, hvis du styrer tavlen herfra. Vælg live, hvis tavlen skal op på en anden skærm.",
    startLocal: "Start på denne enhed",
    startLive: "Start på klasseskærm",
    creatingLive: "Opretter link…",
    liveReady: "Live-links er klar.",
    displayUrl: "Skærmlink",
    openTeacher: "Åbn lærerstyring",
    portableTitle: "Import / eksport",
    portableText: "Importér eller eksportér klassen, når den skal bruges på en anden computer.",
    refreshExport: "Eksportér",
    importLabel: "Importér klasse",
    back: "Tilbage",
    next: "Næste",
    backToStep1: "Ret klassen",
    stepCounter: "Trin",
    privacyTitle: "Privat som udgangspunkt",
    privacyText: "Korte sikkerheder uden ekstra støj.",
    privacyItems: [
      {
        title: "Klasser gemmes lokalt",
        text: "De bliver i lærerens browser, medmindre du eksporterer dem.",
      },
      {
        title: "Live er midlertidigt",
        text: "Live bruges kun til den aktuelle undervisning.",
      },
      {
        title: "Skærmlink er læselink",
        text: "Lærertokens kommer ikke med i display eller eksport.",
      },
    ],
    statuses: {
      loading: "Indlæser lokale klasser…",
      localOnly: "Klasser gemmes kun i denne browser.",
      saved: "Gemt lokalt i denne browser.",
      loaded: (name) => `Indlæste ${name}.`,
      imported: (name) => `Importerede ${name}.`,
      keepStudent: "Behold mindst én elev i klassen.",
      keepRule: "Behold mindst én regel.",
      exportRefreshed: "Eksporten er hentet og kopieret, hvis browseren tillader det.",
      liveCreated: "Klasseskærmen er klar. Åbn lærerstyring, når du vil begynde.",
      liveFailed: "Live-session kunne ikke oprettes.",
      noNames: "Skriv mindst ét elevnavn først.",
      addedStudents: (count) => `Tilføjede ${count} ${count === 1 ? "elev" : "elever"}.`,
      ruleAdded: (label) => `Tilføjede reglen “${label}”.`,
    },
    rulePresets: [
      {
        label: "Venlige ord og hjælpsomme handlinger",
        description: "Når en elev hjælper fællesskabet.",
        stars: 1,
      },
      {
        label: "Klar når timen starter",
        description: "Materialer fremme og opmærksomhed på plads.",
        stars: 1,
      },
      {
        label: "Hjælper en klassekammerat",
        description: "Giver brugbar hjælp uden at overtage.",
        stars: 1,
      },
      {
        label: "Modig læringsfejl",
        description: "Prøver, forklarer og lærer af feedback.",
        stars: 2,
      },
      {
        label: "Forstyrrer læring",
        description: "En rolig påmindelse, når uro stopper andre.",
        stars: -1,
      },
      {
        label: "Utrygt eller uvenligt valg",
        description: "Et tydeligt reset for sikkerhed og respekt.",
        stars: -2,
      },
    ],
  },
  en: {
    languageName: "English",
    themeLight: "Light",
    themeDark: "Dark",
    heroEyebrow: "Classroom Kudos",
    heroTitle: "Ready for class in minutes.",
    heroText: "Just choose: start a new class, or continue with one you saved before.",
    statusLabel: "Status",
    studentsLabel: "Students",
    rulesLabel: "Rules",
    savedLabel: "Saved",
    newClass: "New class",
    setupTitle: "Three quick steps",
    setupText: "Do only what you need now. You can adjust the rest later.",
    steps: {
      "class-roster": {
        label: "Pick class",
        description: "New class or import.",
        title: "1. Pick class",
      },
      "board-details": {
        label: "Rules",
        description: "Choose the essentials.",
        title: "2. Choose simple rules",
      },
      "review-launch": {
        label: "Start",
        description: "Last step before class sees it.",
        title: "3. Start for class",
      },
    },
    startFreshTitle: "Start new class",
    startFreshText: "For a new class. Add names now and start quickly.",
    startFreshButton: "Start new",
    importTitle: "Continue from before",
    importText: "Choose a class saved on this computer, or import one you saved before.",
    continueButton: "Continue / import",
    importPlaceholder: "Paste your exported class here",
    importButton: "Import",
    savedTemplates: "Saved classes",
    className: "Class name",
    studentsTitle: "Students",
    studentsText: "Type the names. Everything else can wait.",
    bulkLabel: "Add several students",
    bulkPlaceholder: "Anna\nMalthe\nSofia",
    bulkButton: "Add names",
    addStudent: "Add one student",
    studentName: "Student name",
    studentAlias: "Alias/group",
    remove: "Remove",
    boardDetailsText: "Choose a few rules so the board is easy to explain to class.",
    presetTitle: "Rule suggestions",
    presetText: "Add only the rules you want to use today.",
    addPreset: "Add",
    customRule: "Add custom rule",
    ruleLabel: "Rule text",
    ruleStars: "Stars",
    goalsTitle: "Goals",
    addGoal: "Add goal",
    goalTitle: "Goal text",
    goalTarget: "Target",
    rewardsTitle: "Rewards",
    addReward: "Add reward",
    rewardTitle: "Reward",
    rewardCost: "Cost",
    preferencesTitle: "Display",
    showRules: "Show rules",
    showGoals: "Show goals",
    showRewards: "Show rewards",
    reducedMotion: "Calmer motion",
    displayNames: "Board names",
    displayNameOptions: {
      displayName: "Student names",
      alias: "Aliases when available",
      initials: "Initials",
    },
    reviewTitle: "Last step: start the board",
    reviewText: "Do a quick check, then choose how class should see the board.",
    readyCheck: "Ready for class",
    visibleSections: "Visible sections",
    motion: "Motion",
    fullMotion: "Normal",
    reduced: "Calm",
    sessionTitle: "Start the board",
    sessionText:
      "Choose local if you control the board here. Choose live if it goes on another classroom screen.",
    startLocal: "Start on this device",
    startLive: "Start on classroom screen",
    creatingLive: "Creating link…",
    liveReady: "Live links are ready.",
    displayUrl: "Display link",
    openTeacher: "Open teacher controls",
    portableTitle: "Import / export",
    portableText: "Import or export the class when it needs to move to another computer.",
    refreshExport: "Export",
    importLabel: "Import class",
    back: "Back",
    next: "Next",
    backToStep1: "Edit class",
    stepCounter: "Step",
    privacyTitle: "Private by default",
    privacyText: "Short safeguards without extra noise.",
    privacyItems: [
      {
        title: "Classes stay local",
        text: "They stay in the teacher browser unless exported.",
      },
      {
        title: "Live is temporary",
        text: "Live mode is only for the current lesson.",
      },
      {
        title: "Display links are read-only",
        text: "Teacher tokens never appear in display or export.",
      },
    ],
    statuses: {
      loading: "Loading local classes…",
      localOnly: "Classes are saved in this browser only.",
      saved: "Saved locally in this browser.",
      loaded: (name) => `Loaded ${name}.`,
      imported: (name) => `Imported ${name}.`,
      keepStudent: "Keep at least one student in the class.",
      keepRule: "Keep at least one rule.",
      exportRefreshed: "Export downloaded and copied if your browser allows it.",
      liveCreated: "Classroom screen is ready. Open teacher controls when you want to begin.",
      liveFailed: "Could not create live session.",
      noNames: "Type at least one student name first.",
      addedStudents: (count) => `Added ${count} ${count === 1 ? "student" : "students"}.`,
      ruleAdded: (label) => `Added “${label}”.`,
    },
    rulePresets: [
      {
        label: "Kind words and helpful actions",
        description: "When a student helps the group.",
        stars: 1,
      },
      {
        label: "Ready when the lesson starts",
        description: "Materials ready and attention in place.",
        stars: 1,
      },
      {
        label: "Helps a classmate",
        description: "Useful help without taking over.",
        stars: 1,
      },
      {
        label: "Brave learning mistake",
        description: "Tries, explains, and learns from feedback.",
        stars: 2,
      },
      {
        label: "Interrupts learning",
        description: "A calm reminder when noise blocks others.",
        stars: -1,
      },
      {
        label: "Unsafe or unkind choice",
        description: "A clear reset for safety and respect.",
        stars: -2,
      },
    ],
  },
};

let language = $state<Language>("da");
let theme = $state<Theme>("light");
let templates = $state<ClassTemplate[]>([]);
let current = $state<ClassTemplate>(createDefaultTemplate());
let status = $state(copy.da.statuses.loading);
let importText = $state("");
let exportText = $state("");
let bulkStudentText = $state("");
let liveDisplayUrl = $state("");
let liveTeacherUrl = $state("");
let busy = $state(false);
let currentStep = $state<SetupStep>("class-roster");
let setupVisible = $state(false);
let stepFocusTarget = $state<HTMLElement | null>(null);
let importFileInput = $state<HTMLInputElement | null>(null);

const t = $derived(copy[language]);
const setupSteps = $derived<SetupStepMeta[]>(
  (["class-roster", "board-details", "review-launch"] as SetupStep[]).map((id, index) => ({
    id,
    number: String(index + 1),
    label: t.steps[id].label,
    title: t.steps[id].title,
    description: t.steps[id].description,
    panelId: `setup-step-${id}`,
  })),
);
const alphabetizedStudents = $derived(alphabetizeStudents(current.students));
const activeStepIndex = $derived(
  Math.max(
    0,
    setupSteps.findIndex((step) => step.id === currentStep),
  ),
);
const activeStep = $derived(setupSteps[activeStepIndex] ?? setupSteps[0]);
const canGoBack = $derived(activeStepIndex > 0);
const canGoNext = $derived(activeStepIndex < setupSteps.length - 1);
const displayNameModeLabel = $derived(t.displayNameOptions[current.preferences.displayNameMode]);

onMount(() => {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  theme = storedTheme === "dark" ? "dark" : "light";
  language = storedLanguage === "en" ? "en" : "da";
  applyDocumentPreferences();
  templates = loadTemplates();
  current = templates[0] ?? createDefaultTemplate();
  exportText = serializeTemplate(current);
  status = copy[language].statuses.localOnly;
});

const applyDocumentPreferences = () => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.lang = language;
  document.documentElement.lang = language;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#07111d" : "#fafafa");
};

const setTheme = (nextTheme: Theme) => {
  theme = nextTheme;
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyDocumentPreferences();
};

const setLanguage = (nextLanguage: Language) => {
  language = nextLanguage;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  applyDocumentPreferences();
  status = copy[nextLanguage].statuses.localOnly;
};

const focusStepPanel = async () => {
  await tick();
  stepFocusTarget?.focus();
};

const goToStep = (step: SetupStep) => {
  setupVisible = true;
  currentStep = step;
  void focusStepPanel();
};

const goToStepOffset = (offset: number) => {
  const nextIndex = Math.min(Math.max(activeStepIndex + offset, 0), setupSteps.length - 1);
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
  status = t.statuses.saved;
};

const selectTemplate = (id: string) => {
  const found = templates.find((template) => template.id === id);
  if (found) {
    current = $state.snapshot(found);
    exportText = serializeTemplate(current);
    status = t.statuses.loaded(current.className);
    goToStep("class-roster");
  }
};

const newTemplate = () => {
  const next = createDefaultTemplate();
  next.className = t.newClass;
  persist(next);
  goToStep("class-roster");
};

const addStudent = () => {
  const student: Student = {
    id: createPrefixedId("student"),
    displayName: `${t.studentsLabel} ${current.students.length + 1}`,
    order: current.students.length,
  };
  persist({ ...current, students: [...current.students, student] });
};

const addBulkStudents = () => {
  const names = bulkStudentText
    .split(/[\n,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);
  if (!names.length) {
    status = t.statuses.noNames;
    return;
  }
  const students = names.map(
    (displayName, index): Student => ({
      id: createPrefixedId("student"),
      displayName,
      order: current.students.length + index,
    }),
  );
  persist({ ...current, students: [...current.students, ...students] });
  bulkStudentText = "";
  status = t.statuses.addedStudents(students.length);
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
    status = t.statuses.keepStudent;
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
        label: language === "da" ? "Egen klasseregel" : "Custom classroom rule",
        stars: 1,
      },
    ],
  });

const addRulePreset = (preset: RulePreset) => {
  persist({
    ...current,
    rules: [...current.rules, { id: createPrefixedId("rule"), ...preset }],
  });
  status = t.statuses.ruleAdded(preset.label);
};

const updateRule = (id: string, patch: Partial<Rule>) =>
  persist({
    ...current,
    rules: current.rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
  });

const updateRuleStars = (id: string, value: string) => {
  const stars = Number(value);
  if (!Number.isInteger(stars) || stars === 0 || stars < -10 || stars > 10) return;
  updateRule(id, { stars });
};
const removeRule = (id: string) => {
  if (current.rules.length <= 1) {
    status = t.statuses.keepRule;
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
      {
        id: createPrefixedId("goal"),
        title: language === "da" ? "Dagens fokus" : "Today’s focus",
      },
    ],
  });
const updateGoal = (id: string, patch: Partial<Goal>) =>
  persist({
    ...current,
    goals: current.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)),
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
      {
        id: createPrefixedId("reward"),
        title: language === "da" ? "Klassevalg" : "Class choice",
      },
    ],
  });
const updateReward = (id: string, patch: Partial<Reward>) =>
  persist({
    ...current,
    rewards: current.rewards.map((reward) => (reward.id === id ? { ...reward, ...patch } : reward)),
  });
const removeReward = (id: string) =>
  persist({
    ...current,
    rewards: current.rewards.filter((reward) => reward.id !== id),
  });

const exportFileName = () => {
  const safeClassName = current.className
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
  return `${safeClassName || "kudos-class"}.kudos.json`;
};

const exportTemplate = () => {
  exportText = serializeTemplate(current);
  void navigator.clipboard?.writeText(exportText)?.catch(() => undefined);
  const url = URL.createObjectURL(new Blob([exportText], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName();
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  status = t.statuses.exportRefreshed;
};

const getCurrentTemplate = () => classTemplateSchema.parse(current);

const importTemplate = () => {
  const parsed = parseTemplateJson(importText);
  if (!parsed.ok) {
    status = parsed.issues?.join(" ") ?? parsed.message;
    return;
  }
  persist(parsed.value);
  importText = "";
  status = t.statuses.imported(parsed.value.className);
  goToStep("class-roster");
};

const openImportFile = () => {
  importFileInput?.click();
};

const importFile = async (event: Event) => {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  importText = await file.text();
  importTemplate();
  input.value = "";
};

const startLocalSession = () => {
  const session = createSessionFromTemplate(getCurrentTemplate(), "local");
  window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  window.location.assign("/local/session");
};

const startLiveSession = async () => {
  busy = true;
  liveDisplayUrl = "";
  liveTeacherUrl = "";
  try {
    const response = await fetch("/api/session/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ template: getCurrentTemplate() }),
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.message ?? t.statuses.liveFailed);
    window.localStorage.setItem(`kudos.live.${body.sessionId}`, JSON.stringify(body));
    liveDisplayUrl = body.displayUrl;
    liveTeacherUrl = body.teacherUrl;
    status = t.statuses.liveCreated;
  } catch (error) {
    status = error instanceof Error ? error.message : t.statuses.liveFailed;
  } finally {
    busy = false;
  }
};

const formatStars = (stars: number) => `${stars > 0 ? "+" : ""}${stars}`;
</script>

<div class="grid gap-4">
  <input bind:this={importFileInput} class="sr-only" type="file" accept=".json,application/json" onchange={importFile} aria-hidden="true" tabindex="-1" />

  <section class="k-card overflow-hidden p-4 sm:p-6" aria-labelledby="landing-heading">
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div class="max-w-3xl">
        <div class="flex items-center gap-2">
          <span class="grid size-9 place-items-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm" aria-hidden="true">✦</span>
          <p class="k-eyebrow">{t.heroEyebrow}</p>
        </div>
        <h1 id="landing-heading" class="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          {t.heroTitle}
        </h1>
        <p class="mt-3 max-w-2xl text-base leading-7 text-[var(--text-soft)]">
          {t.heroText}
        </p>
        <div class="mt-6 grid gap-3 sm:grid-cols-2" aria-label={t.setupTitle}>
          <button class="group rounded-3xl border border-[color-mix(in_oklch,var(--primary)_28%,transparent)] bg-[var(--surface-soft)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklch,var(--ring)_30%,transparent)]" type="button" onclick={newTemplate}>
            <span class="k-eyebrow">1</span>
            <span class="mt-2 block text-2xl font-bold text-[var(--foreground)]">{t.startFreshTitle}</span>
            <span class="mt-2 block text-sm leading-6 text-[var(--text-soft)]">{t.startFreshText}</span>
            <span class="k-button-primary mt-4 pointer-events-none">{t.startFreshButton}</span>
          </button>
          <button class="group rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklch,var(--ring)_30%,transparent)]" type="button" onclick={() => goToStep("class-roster")}>
            <span class="k-eyebrow">2</span>
            <span class="mt-2 block text-2xl font-bold text-[var(--foreground)]">{t.importTitle}</span>
            <span class="mt-2 block text-sm leading-6 text-[var(--text-soft)]">{t.importText}</span>
            <span class="mt-3 inline-flex rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-bold text-[var(--foreground)]">{templates.length} {t.savedLabel}</span>
            <span class="k-button-soft mt-4 pointer-events-none">{t.continueButton}</span>
          </button>
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-2 lg:w-72 lg:grid-cols-1" aria-label="Language and theme">
        <div class="grid grid-cols-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-1">
          <button class="rounded-xl px-3 py-2 text-sm font-bold transition" style:background={language === "da" ? "var(--card)" : "transparent"} type="button" aria-pressed={language === "da"} onclick={() => setLanguage("da")}>DA</button>
          <button class="rounded-xl px-3 py-2 text-sm font-bold transition" style:background={language === "en" ? "var(--card)" : "transparent"} type="button" aria-pressed={language === "en"} onclick={() => setLanguage("en")}>EN</button>
        </div>
        <div class="grid grid-cols-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-1">
          <button class="rounded-xl px-3 py-2 text-sm font-bold transition" style:background={theme === "light" ? "var(--card)" : "transparent"} type="button" aria-pressed={theme === "light"} onclick={() => setTheme("light")}>☀ {t.themeLight}</button>
          <button class="rounded-xl px-3 py-2 text-sm font-bold transition" style:background={theme === "dark" ? "var(--card)" : "transparent"} type="button" aria-pressed={theme === "dark"} onclick={() => setTheme("dark")}>☾ {t.themeDark}</button>
        </div>
      </div>
    </div>
  </section>

  {#if setupVisible}
  <section class="k-card overflow-hidden" aria-labelledby="setup-heading">
    <div class="border-b border-[var(--border-soft)] p-4 sm:p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="max-w-2xl">
          <p class="k-eyebrow">{t.setupTitle}</p>
          <h2 id="setup-heading" class="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {activeStep.title}
          </h2>
          <p class="mt-2 text-sm leading-6 text-[var(--text-soft)]">{t.setupText}</p>
        </div>

        <section class="inline-flex max-w-full items-start gap-2 rounded-2xl border border-[color-mix(in_oklch,var(--primary)_24%,transparent)] bg-[var(--surface-soft)] px-3 py-2 text-sm leading-5 text-[var(--foreground)]" aria-label={t.statusLabel} aria-live="polite">
          <span class="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-[color-mix(in_oklch,var(--primary)_70%,var(--foreground)_30%)]">{t.statusLabel}</span>
          <span>{status}</span>
        </section>
      </div>

      <dl class="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-soft)]" aria-label={`${t.setupTitle} ${t.statusLabel}`}>
        <div class="flex items-baseline gap-2"><dt class="k-eyebrow">{t.studentsLabel}</dt><dd class="font-bold text-[var(--foreground)]">{current.students.length}</dd></div>
        <div class="flex items-baseline gap-2"><dt class="k-eyebrow">{t.rulesLabel}</dt><dd class="font-bold text-[var(--foreground)]">{current.rules.length}</dd></div>
        <div class="flex items-baseline gap-2"><dt class="k-eyebrow">{t.savedLabel}</dt><dd class="font-bold text-[var(--foreground)]">{templates.length}</dd></div>
      </dl>

      <nav class="mt-4" aria-label={t.setupTitle}>
        <ol class="grid gap-2 sm:grid-cols-3">
          {#each setupSteps as step}
            <li class="min-w-0">
              <button class="flex min-h-14 w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ring)]" style:background={currentStep === step.id ? "var(--surface-soft)" : "var(--surface-muted)"} style:border-color={currentStep === step.id ? "var(--primary)" : "var(--border-soft)"} type="button" aria-current={currentStep === step.id ? "step" : undefined} aria-controls={step.panelId} onclick={() => goToStep(step.id)}>
                <span class="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--primary-foreground)]">{step.number}</span>
                <span><span class="block text-[var(--foreground)]">{step.label}</span><span class="block text-xs font-medium text-[var(--text-soft)]">{step.description}</span></span>
              </button>
            </li>
          {/each}
        </ol>
      </nav>
    </div>

    <div class="grid gap-6 p-4 sm:p-6">
      {#if currentStep === "class-roster"}
        <section bind:this={stepFocusTarget} id="setup-step-class-roster" class="grid gap-5 outline-none" aria-labelledby="setup-step-class-roster-heading" tabindex="-1">
          <div>
            <p class="k-eyebrow">{t.stepCounter} 1</p>
            <h3 id="setup-step-class-roster-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.steps["class-roster"].title}</h3>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <section class="k-panel-soft p-4" aria-labelledby="fresh-heading">
              <h4 id="fresh-heading" class="text-xl font-bold text-[var(--foreground)]">{t.startFreshTitle}</h4>
              <p class="mt-2 text-sm leading-6 text-[var(--text-soft)]">{t.startFreshText}</p>
              <button class="k-button-primary mt-4" type="button" onclick={newTemplate}>{t.startFreshButton}</button>
            </section>
            <section class="k-panel p-4" aria-labelledby="import-heading">
              <h4 id="import-heading" class="text-xl font-bold text-[var(--foreground)]">{t.importTitle}</h4>
              <p class="mt-2 text-sm leading-6 text-[var(--text-soft)]">{t.importText}</p>
              <button class="k-button-soft mt-4 w-full" type="button" onclick={openImportFile}>{t.importButton}</button>
              <details class="mt-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-soft)]">
                <summary class="cursor-pointer font-semibold text-[var(--foreground)]">{t.importLabel}</summary>
                <textarea aria-label={t.importLabel} class="k-input k-subtle-scrollbar mt-3 min-h-24 font-mono text-xs" placeholder={t.importPlaceholder} bind:value={importText}></textarea>
                <button class="k-button-soft mt-3 w-full" type="button" onclick={importTemplate}>{t.importButton}</button>
              </details>
            </section>
          </div>

          <section class="grid gap-4 md:grid-cols-2" aria-label={t.className}>
            <label class="grid gap-2">
              <span class="k-label">{t.savedTemplates}</span>
              <select class="k-input" value={current.id} onchange={(event) => selectTemplate(event.currentTarget.value)}>
                {#each templates as template}
                  <option value={template.id}>{template.className}</option>
                {/each}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="k-label">{t.className}</span>
              <input class="k-input text-lg font-semibold" value={current.className} oninput={(event) => persist({ ...current, className: event.currentTarget.value })} />
            </label>
          </section>

          <section class="k-panel-soft p-4 sm:p-5" aria-labelledby="students-heading">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="k-eyebrow">{t.studentsLabel}</p>
                <h4 id="students-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.studentsTitle}</h4>
                <p class="mt-1 text-sm leading-6 text-[var(--text-soft)]">{t.studentsText}</p>
              </div>
              <button class="k-button-soft" type="button" onclick={addStudent}>{t.addStudent}</button>
            </div>
            <div class="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label class="grid gap-2">
                <span class="k-label">{t.bulkLabel}</span>
                <textarea class="k-input k-subtle-scrollbar min-h-24" placeholder={t.bulkPlaceholder} bind:value={bulkStudentText}></textarea>
              </label>
              <button class="k-button-primary" type="button" onclick={addBulkStudents}>{t.bulkButton}</button>
            </div>
            <div class="k-subtle-scrollbar mt-4 grid max-h-[28rem] gap-3 overflow-auto pr-1">
              {#each alphabetizedStudents as student, index (student.id)}
                <div class="grid gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-3 md:grid-cols-[3rem_1fr_1fr_auto] md:items-center">
                  <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-soft)] font-semibold text-[var(--foreground)]">{index + 1}</div>
                  <input aria-label={t.studentName} class="k-input" value={student.displayName} oninput={(event) => updateStudent(student.id, { displayName: event.currentTarget.value })} />
                  <input aria-label={t.studentAlias} class="k-input" placeholder={t.studentAlias} value={student.alias ?? ""} oninput={(event) => updateStudent(student.id, { alias: event.currentTarget.value })} />
                  <button class="k-button-soft" type="button" onclick={() => removeStudent(student.id)}>{t.remove}</button>
                </div>
              {/each}
            </div>
          </section>
        </section>
      {:else if currentStep === "board-details"}
        <section bind:this={stepFocusTarget} id="setup-step-board-details" class="grid gap-6 outline-none" aria-labelledby="setup-step-board-details-heading" tabindex="-1">
          <div>
            <p class="k-eyebrow">{t.stepCounter} 2</p>
            <h3 id="setup-step-board-details-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.steps["board-details"].title}</h3>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">{t.boardDetailsText}</p>
          </div>

          <section class="k-panel-soft p-4 sm:p-5" aria-labelledby="preset-rules-heading">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="k-eyebrow">{t.rulesLabel}</p>
                <h4 id="preset-rules-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.presetTitle}</h4>
                <p class="mt-1 text-sm leading-6 text-[var(--text-soft)]">{t.presetText}</p>
              </div>
              <button class="k-button-soft" type="button" onclick={addRule}>{t.customRule}</button>
            </div>
            <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {#each t.rulePresets as preset}
                <button class="rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklch,var(--ring)_28%,transparent)]" type="button" onclick={() => addRulePreset(preset)}>
                  <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style:background={preset.stars > 0 ? "color-mix(in oklch, var(--primary) 18%, transparent)" : "color-mix(in oklch, var(--danger) 14%, transparent)"}>{formatStars(preset.stars)}</span>
                  <span class="mt-3 block font-bold text-[var(--foreground)]">{preset.label}</span>
                  <span class="mt-1 block text-sm leading-6 text-[var(--text-soft)]">{preset.description}</span>
                  <span class="mt-3 inline-flex text-sm font-bold text-[color-mix(in_oklch,var(--primary)_72%,var(--foreground)_28%)]">{t.addPreset}</span>
                </button>
              {/each}
            </div>
          </section>

          <div class="grid gap-5 2xl:grid-cols-2">
            <section class="k-panel p-4 sm:p-5" aria-labelledby="rules-heading">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div><p class="k-eyebrow">{t.rulesLabel}</p><h4 id="rules-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.rulesLabel}</h4></div>
                <button class="k-button-soft" type="button" onclick={addRule}>{t.customRule}</button>
              </div>
              <div class="mt-4 grid gap-3">
                {#each current.rules as rule}
                  <div class="grid gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3 md:grid-cols-[1fr_7rem_auto]">
                    <input aria-label={t.ruleLabel} class="k-input" value={rule.label} oninput={(event) => updateRule(rule.id, { label: event.currentTarget.value })} />
                    <input aria-label={t.ruleStars} class="k-input" type="number" min="-10" max="10" value={rule.stars} onchange={(event) => updateRuleStars(rule.id, event.currentTarget.value)} />
                    <button class="k-button-soft" type="button" onclick={() => removeRule(rule.id)}>{t.remove}</button>
                  </div>
                {/each}
              </div>
            </section>

            <section class="k-panel p-4 sm:p-5" aria-labelledby="goals-heading">
              <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="k-eyebrow">{t.goalsTitle}</p><h4 id="goals-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.goalsTitle}</h4></div><button class="k-button-soft" type="button" onclick={addGoal}>{t.addGoal}</button></div>
              <div class="mt-4 grid gap-3">
                {#each current.goals as goal}
                  <div class="grid gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3 md:grid-cols-[1fr_7rem_auto]">
                    <input aria-label={t.goalTitle} class="k-input" value={goal.title} oninput={(event) => updateGoal(goal.id, { title: event.currentTarget.value })} />
                    <input aria-label={t.goalTarget} class="k-input" type="number" min="1" value={goal.targetStars ?? ""} oninput={(event) => updateGoal(goal.id, { targetStars: Number(event.currentTarget.value) || undefined })} />
                    <button class="k-button-soft" type="button" onclick={() => removeGoal(goal.id)}>{t.remove}</button>
                  </div>
                {/each}
              </div>
            </section>

            <section class="k-panel p-4 sm:p-5" aria-labelledby="rewards-heading">
              <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="k-eyebrow">{t.rewardsTitle}</p><h4 id="rewards-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.rewardsTitle}</h4></div><button class="k-button-soft" type="button" onclick={addReward}>{t.addReward}</button></div>
              <div class="mt-4 grid gap-3">
                {#each current.rewards as reward}
                  <div class="grid gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3 md:grid-cols-[1fr_7rem_auto]">
                    <input aria-label={t.rewardTitle} class="k-input" value={reward.title} oninput={(event) => updateReward(reward.id, { title: event.currentTarget.value })} />
                    <input aria-label={t.rewardCost} class="k-input" type="number" min="1" value={reward.costStars ?? ""} oninput={(event) => updateReward(reward.id, { costStars: Number(event.currentTarget.value) || undefined })} />
                    <button class="k-button-soft" type="button" onclick={() => removeReward(reward.id)}>{t.remove}</button>
                  </div>
                {/each}
              </div>
            </section>

            <section class="k-panel p-4 sm:p-5" aria-labelledby="preferences-heading">
              <div><p class="k-eyebrow">{t.preferencesTitle}</p><h4 id="preferences-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.preferencesTitle}</h4></div>
              <div class="mt-4 grid gap-3 text-sm text-[var(--foreground)]">
                <label class="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3"><input type="checkbox" checked={current.preferences.showRules} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, showRules: event.currentTarget.checked } })} /> {t.showRules}</label>
                <label class="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3"><input type="checkbox" checked={current.preferences.showGoals} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, showGoals: event.currentTarget.checked } })} /> {t.showGoals}</label>
                <label class="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3"><input type="checkbox" checked={current.preferences.showRewards} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, showRewards: event.currentTarget.checked } })} /> {t.showRewards}</label>
                <label class="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3"><input type="checkbox" checked={current.preferences.reducedMotion} onchange={(event) => persist({ ...current, preferences: { ...current.preferences, reducedMotion: event.currentTarget.checked } })} /> {t.reducedMotion}</label>
                <label class="grid gap-2"><span class="k-label">{t.displayNames}</span><select class="k-input" value={current.preferences.displayNameMode} onchange={(event) => persist({ ...current, preferences: { ...defaultPreferences, ...current.preferences, displayNameMode: event.currentTarget.value as typeof current.preferences.displayNameMode } })}><option value="displayName">{t.displayNameOptions.displayName}</option><option value="alias">{t.displayNameOptions.alias}</option><option value="initials">{t.displayNameOptions.initials}</option></select></label>
              </div>
            </section>
          </div>
        </section>
      {:else}
        <section bind:this={stepFocusTarget} id="setup-step-review-launch" class="grid gap-6 outline-none" aria-labelledby="setup-step-review-launch-heading" tabindex="-1">
          <div>
            <p class="k-eyebrow">{t.stepCounter} 3</p>
            <h3 id="setup-step-review-launch-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.reviewTitle}</h3>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">{t.reviewText}</p>
          </div>

          <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <section class="k-panel-soft p-4 sm:p-5" aria-labelledby="review-summary-heading">
              <p class="k-eyebrow">{t.readyCheck}</p>
              <h4 id="review-summary-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{current.className}</h4>
              <dl class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-3"><dt class="k-eyebrow">{t.studentsLabel}</dt><dd class="mt-1 text-xl font-bold text-[var(--foreground)]">{current.students.length}</dd></div>
                <div class="rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-3"><dt class="k-eyebrow">{t.rulesLabel}</dt><dd class="mt-1 text-xl font-bold text-[var(--foreground)]">{current.rules.length}</dd></div>
                <div class="rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-3"><dt class="k-eyebrow">{t.goalsTitle}</dt><dd class="mt-1 text-xl font-bold text-[var(--foreground)]">{current.goals.length}</dd></div>
                <div class="rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-3"><dt class="k-eyebrow">{t.rewardsTitle}</dt><dd class="mt-1 text-xl font-bold text-[var(--foreground)]">{current.rewards.length}</dd></div>
              </dl>
              <div class="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--text-soft)]">
                <p><span class="font-semibold text-[var(--foreground)]">{t.displayNames}:</span> {displayNameModeLabel}</p>
                <p><span class="font-semibold text-[var(--foreground)]">{t.visibleSections}:</span> {t.rulesLabel} {current.preferences.showRules ? "on" : "off"}, {t.goalsTitle} {current.preferences.showGoals ? "on" : "off"}, {t.rewardsTitle} {current.preferences.showRewards ? "on" : "off"}</p>
                <p><span class="font-semibold text-[var(--foreground)]">{t.motion}:</span> {current.preferences.reducedMotion ? t.reduced : t.fullMotion}</p>
              </div>
            </section>

            <section class="k-panel p-4 sm:p-5" aria-labelledby="session-actions-heading">
              <p class="k-eyebrow">{t.sessionTitle}</p>
              <h4 id="session-actions-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.sessionTitle}</h4>
              <p class="mt-3 text-sm leading-6 text-[var(--text-soft)]">{t.sessionText}</p>
              <div class="mt-4 grid gap-2">
                <button class="k-button-primary text-base" type="button" onclick={startLocalSession}>{t.startLocal}</button>
                <button class="k-button-soft text-base" type="button" disabled={busy} onclick={startLiveSession}>{busy ? t.creatingLive : t.startLive}</button>
              </div>
              {#if liveDisplayUrl}
                <div class="mt-3 grid gap-2 rounded-2xl border border-[color-mix(in_oklch,var(--accent)_28%,transparent)] bg-[color-mix(in_oklch,var(--accent)_12%,transparent)] p-3 text-sm text-[var(--foreground)]" aria-live="polite">
                  <p class="font-semibold text-[var(--foreground)]">{t.liveReady}</p>
                  <a class="block break-all font-semibold underline" href={liveDisplayUrl} target="_blank" rel="noreferrer">{t.displayUrl}: {liveDisplayUrl}</a>
                  {#if liveTeacherUrl}
                    <a class="k-button-primary mt-1 text-center" href={liveTeacherUrl}>{t.openTeacher}</a>
                  {/if}
                </div>
              {/if}
            </section>
          </div>

          <section class="k-panel p-4 sm:p-5" aria-labelledby="portable-template-heading">
            <p class="k-eyebrow">{t.portableTitle}</p>
            <h4 id="portable-template-heading" class="mt-1 text-2xl font-bold text-[var(--foreground)]">{t.portableTitle}</h4>
            <p class="mt-2 text-sm leading-6 text-[var(--text-soft)]">{t.portableText}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button class="k-button-soft" type="button" onclick={exportTemplate}>{t.refreshExport}</button>
              <button class="k-button-primary" type="button" onclick={openImportFile}>{t.importButton}</button>
            </div>
          </section>
        </section>
      {/if}

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-5">
        <button class="k-button-soft" type="button" disabled={!canGoBack} onclick={() => goToStepOffset(-1)}>{t.back}</button>
        <p class="text-sm font-semibold text-[var(--text-soft)]">{t.stepCounter} {activeStep.number} / {setupSteps.length}: {activeStep.label}</p>
        {#if canGoNext}
          <button class="k-button-primary" type="button" onclick={() => goToStepOffset(1)}>{t.next}</button>
        {:else}
          <button class="k-button-soft" type="button" onclick={() => goToStep("class-roster")}>{t.backToStep1}</button>
        {/if}
      </div>
    </div>
  </section>

  {/if}

  <section class="k-card p-4 sm:p-5" aria-labelledby="privacy-heading">
    <div class="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:items-center">
      <div>
        <p class="k-eyebrow">{t.privacyTitle}</p>
        <h2 id="privacy-heading" class="mt-1 text-xl font-bold text-[var(--foreground)]">{t.privacyTitle}</h2>
        <p class="mt-2 text-sm leading-6 text-[var(--text-soft)]">{t.privacyText}</p>
      </div>
      <ul class="grid gap-2 text-sm leading-6 text-[var(--text-soft)] md:grid-cols-3">
        {#each t.privacyItems as item}
          <li class="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3">
            <strong class="block font-semibold text-[var(--foreground)]">{item.title}</strong>
            <span>{item.text}</span>
          </li>
        {/each}
      </ul>
    </div>
  </section>
</div>
