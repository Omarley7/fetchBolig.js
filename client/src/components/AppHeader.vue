<script setup lang="ts">
import { useDarkMode } from "~/composables/useDarkMode";
import { useI18n } from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher.vue";
import LoginForm from "./LoginForm.vue";

const { t } = useI18n();
const { isDark, toggle: toggleDarkMode } = useDarkMode();
</script>

<template>
  <nav class="flex items-center gap-3">
    <!-- Left: nav icon (equal width to right for centering) -->
    <div class="flex-1 flex justify-start">
      <router-link v-if="$route.path !== '/'" to="/" class="transition-colors">
        <img src="/icons/home.svg" alt="Home" class="size-8 dark:invert" />
      </router-link>
      <router-link v-else to="/appointments">
        <img
          src="/icons/calendar-days.svg"
          alt="Appointments"
          class="size-8 dark:invert transition-transform hover:scale-125"
        />
      </router-link>
    </div>

    <!-- Center: title (true center, shrinks on small screens) -->
    <router-link to="/" class="min-w-0 shrink-0 text-center">
      <h1 class="truncate font-bold dark:text-neutral-200 text-neutral-700 max-sm:text-2xl! sm:pb-2">
        {{ t("common.appTitle") }}
      </h1>
    </router-link>

    <!-- Right: dark mode toggle + login (equal width to left for centering) -->
    <div class="flex-1 flex items-center justify-end gap-2">
      <LanguageSwitcher />
      <button
        @click="toggleDarkMode"
        class="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <img v-if="isDark" src="/icons/sun.svg" alt="Light mode" class="size-5 invert" />
        <img v-else src="/icons/moon.svg" alt="Dark mode" class="size-5" />
      </button>
      <LoginForm class="transition-transform hover:scale-125" />
    </div>
  </nav>
</template>
