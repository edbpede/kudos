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
		"k-card":
			"rounded-3xl border border-amber-200/70 bg-white/90 shadow-sm shadow-amber-900/5",
		"k-button":
			"inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 font-semibold transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50",
		"k-button-primary":
			"k-button bg-amber-500 text-amber-950 hover:bg-amber-400",
		"k-button-soft": "k-button bg-amber-100 text-amber-950 hover:bg-amber-200",
		"k-input":
			"w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-slate-900 shadow-inner shadow-amber-950/5 focus:border-amber-400 focus:outline-none focus:ring-3 focus:ring-amber-200",
		"k-label": "text-sm font-semibold text-slate-700",
	},
});
