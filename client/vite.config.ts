import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const fs = require("fs");

  const parentDir = path.resolve(__dirname, "../.");
  const files = fs.readdirSync(parentDir);
  console.log(`Files in ${parentDir}:`, files);

  const currentDirFiles = fs.readdirSync(__dirname);
  console.log(`Files in ${__dirname}:`, currentDirFiles);

  return {
    plugins: [vue(), tailwindcss()],
    envDir: "..", // <- repo root
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "src"),
        "@": path.resolve(__dirname, "../shared"),
      },
    },
  };
});
