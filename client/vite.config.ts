import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
      "@": path.resolve(__dirname, "../shared"),
    },
  },
});
