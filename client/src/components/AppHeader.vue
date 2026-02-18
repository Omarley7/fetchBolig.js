<script setup lang="ts">
import LoginForm from "./LoginForm.vue";
import { useI18n } from "../i18n";

const { t } = useI18n();
</script>

<template>
  <nav class="flex items-center gap-3">
    <!-- Left: nav icon (never shrinks) -->
    <div class="shrink-0">
      <router-link v-if="$route.path !== '/'" to="/" class="transition-colors">
        <img src="https://unpkg.com/lucide-static@latest/icons/home.svg" alt="Home" class="size-8 dark:invert" />
      </router-link>
      <router-link v-else to="/appointments">
        <img src="https://unpkg.com/lucide-static@latest/icons/calendar-days.svg" alt="Appointments"
          class="size-8 dark:invert transition-transform hover:scale-125" />
      </router-link>
    </div>

    <!-- Center: title (collapses on small screens, always links home) -->
    <router-link to="/" class="min-w-0 flex-1 text-center">
      <h1 class="truncate font-bold dark:text-neutral-200 text-neutral-700 max-sm:text-2xl! sm:pb-2">{{
        t("common.appTitle") }}</h1>
    </router-link>

    <!-- Right: login (never shrinks) -->
    <LoginForm class="shrink-0 transition-transform hover:scale-125" />
  </nav>
</template>
