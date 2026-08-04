import { defineConfig, presetWind4 } from "unocss";

export default defineConfig({
  presets: [
    presetWind4({
      preflights: {
        reset: true,
      },
    }),
  ],
  shortcuts: {
    "k-shell": "relative min-h-screen overflow-hidden text-[var(--foreground)]",
    "k-page": "mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8",
    "k-eyebrow":
      "text-xs font-semibold uppercase tracking-[0.14em] text-[color-mix(in_oklch,var(--primary)_70%,var(--foreground)_30%)]",
    "k-card":
      "rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] text-[var(--card-foreground)] shadow-[var(--shadow)]",
    "k-panel": "rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-sm",
    "k-panel-soft":
      "rounded-2xl border border-[color-mix(in_oklch,var(--primary)_24%,transparent)] bg-[var(--surface-soft)] shadow-sm",
    "k-button":
      "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklch,var(--ring)_55%,transparent)] disabled:cursor-not-allowed disabled:opacity-45",
    "k-button-primary":
      "k-button bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:brightness-105",
    "k-button-soft":
      "k-button border border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[color-mix(in_oklch,var(--primary)_11%,var(--surface-muted))]",
    "k-button-danger":
      "k-button border border-[color-mix(in_oklch,var(--danger)_32%,transparent)] bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] text-[var(--foreground)] hover:bg-[color-mix(in_oklch,var(--danger)_16%,transparent)]",
    "k-input":
      "w-full rounded-xl border border-[var(--border-soft)] bg-[color-mix(in_oklch,var(--card)_78%,var(--background)_22%)] px-3.5 py-3 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-3 focus:ring-[color-mix(in_oklch,var(--ring)_22%,transparent)]",
    "k-label": "text-sm font-semibold text-[var(--foreground)]",
    "k-muted": "text-sm leading-6 text-[var(--text-soft)]",
    "k-pill":
      "inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]",
    "k-stat":
      "rounded-xl border border-[color-mix(in_oklch,var(--primary)_22%,transparent)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--foreground)]",
  },
});
