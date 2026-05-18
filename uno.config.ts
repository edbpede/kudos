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
		"k-shell": "relative min-h-screen overflow-hidden text-emerald-50",
		"k-page": "mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8",
		"k-eyebrow":
			"text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/80",
		"k-card":
			"rounded-2xl border border-white/10 bg-slate-950/62 shadow-lg shadow-black/20",
		"k-panel":
			"rounded-xl border border-white/10 bg-white/6 shadow-sm shadow-black/10",
		"k-panel-soft":
			"rounded-xl border border-emerald-300/14 bg-emerald-300/7 shadow-sm shadow-black/10",
		"k-button":
			"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-300/75 disabled:cursor-not-allowed disabled:opacity-45",
		"k-button-primary":
			"k-button bg-emerald-300 text-slate-950 shadow-sm shadow-emerald-500/10 hover:bg-emerald-200",
		"k-button-soft":
			"k-button border border-white/12 bg-white/8 text-emerald-50 hover:bg-white/14",
		"k-button-danger":
			"k-button border border-rose-300/30 bg-rose-400/12 text-rose-50 hover:bg-rose-400/20",
		"k-input":
			"w-full rounded-xl border border-white/12 bg-slate-950/55 px-3.5 py-3 text-emerald-50 outline-none transition placeholder:text-slate-400 focus:border-emerald-300/70 focus:ring-3 focus:ring-emerald-300/20",
		"k-label": "text-sm font-semibold text-emerald-50",
		"k-muted": "text-sm leading-6 text-slate-300",
		"k-pill":
			"inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/7 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100",
		"k-stat":
			"rounded-xl border border-emerald-300/16 bg-emerald-300/8 px-4 py-3 text-emerald-50",
	},
});
