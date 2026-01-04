import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "esnext",
    outDir: "dist",
    ssr: true,
    rollupOptions: {
      input: "src/index.ts",
      output: {
        format: "esm",
        entryFileNames: "index.js",
      },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
      "@": path.resolve(__dirname, "../shared"),
    },
  },
  ssr: {
    noExternal: true,
  },
});
