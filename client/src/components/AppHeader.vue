<script setup lang="ts">
import LoginForm from "./LoginForm.vue";
import { useI18n } from "../i18n";

const { t } = useI18n();
</script>

<template>
  <div class="flex justify-end items-end gap-2 mb-2">
    <div>
      <router-link v-if="$route.path !== '/'" to="/"
        class="text-blue-400 hover:text-blue-300 underline transition-colors">
        <img src="https://unpkg.com/lucide-static@latest/icons/home.svg" alt="Home"
          class="size-8 inline-block dark:invert mb-2" />
      </router-link>
      <router-link v-else to="/appointments" class="text-blue-400 hover:text-blue-300 underline transition-colors">
        <img src="https://unpkg.com/lucide-static@latest/icons/calendar-days.svg" alt="Appointments"
          class="size-8 inline-block dark:invert mb-2" />
      </router-link>
    </div>

    <h1 class="mx-auto">{{ t("common.appTitle") }}</h1>
    <LoginForm class="mb-1" />
  </div>
</template>
