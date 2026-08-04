import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [UnoCSS(), svelte()],
});
