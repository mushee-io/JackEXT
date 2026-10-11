import {defineConfig} from "vite";
import tailwindcss from "@tailwindcss/vite";

// The built page is packaged inside the Chrome/Brave extension.
// Run npm run build:ui from the repository root.
export default defineConfig({
  root: "web",
  base: "./",
  plugins: [tailwindcss()],
  build: {
    outDir: "../extension/experience",
    emptyOutDir: true,
    target: "es2022"
  }
});
