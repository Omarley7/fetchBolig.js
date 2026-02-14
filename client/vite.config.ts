import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.includes("add-"),
        },
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
      "@": path.resolve(__dirname, "../shared"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vue-vendor": ["vue", "pinia", "pinia-plugin-persistedstate"],
          "vue-i18n": ["vue-i18n"],
        },
      },
    },
  },
});
