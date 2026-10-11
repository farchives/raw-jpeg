import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves project sites at /<repo>/ — keep in sync with the repo name.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/raw-jpeg/",
  plugins: [react(), tailwindcss()],
  worker: { format: "es" },
});
