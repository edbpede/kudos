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
			"text-xs font-black uppercase tracking-[0.22em] text-emerald-200/85",
		"k-card":
			"rounded-[2rem] border border-white/12 bg-slate-950/58 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl",
		"k-panel":
			"rounded-[1.5rem] border border-white/10 bg-white/7 shadow-lg shadow-black/20 backdrop-blur-md",
		"k-panel-soft":
			"rounded-[1.5rem] border border-emerald-300/18 bg-emerald-400/8 shadow-lg shadow-emerald-950/20",
		"k-button":
			"inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black tracking-tight transition duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-300/75 disabled:cursor-not-allowed disabled:opacity-45",
		"k-button-primary":
			"k-button bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-200",
		"k-button-soft":
			"k-button border border-white/12 bg-white/10 text-emerald-50 hover:bg-white/16",
		"k-button-danger":
			"k-button border border-rose-300/30 bg-rose-400/14 text-rose-50 hover:bg-rose-400/22",
		"k-input":
			"w-full rounded-2xl border border-white/12 bg-slate-950/55 px-3.5 py-3 text-emerald-50 shadow-inner shadow-black/20 outline-none transition placeholder:text-slate-400 focus:border-emerald-300/70 focus:ring-3 focus:ring-emerald-300/20",
		"k-label": "text-sm font-black text-emerald-50",
		"k-muted": "text-sm leading-6 text-slate-300",
		"k-pill":
			"inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100",
		"k-stat":
			"rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-emerald-50",
	},
});
