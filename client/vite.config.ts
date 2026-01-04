import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  console.log(path.resolve(__dirname, "../."));
  console.log("/home/omar/fetchBolig.js");

  return {
    plugins: [vue(), tailwindcss()],
    envDir: path.resolve(__dirname, "../."), // <- repo root
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "src"),
        "@": path.resolve(__dirname, "../shared"),
      },
    },
  };
});
