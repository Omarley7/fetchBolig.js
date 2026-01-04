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
        entryFileNames: "index",
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
