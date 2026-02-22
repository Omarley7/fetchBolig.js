<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";
import { useDarkMode } from "~/composables/useDarkMode";
import { useI18n } from "vue-i18n";
import LanguageSwitcher from "~/components/LanguageSwitcher.vue";

const auth = useAuth();
const { isDark, toggle: toggleDarkMode } = useDarkMode();
const { t } = useI18n();

async function handleLogin() {
  await auth.login(auth.email, auth.password);
}
</script>

<template>
  <div class="flex flex-col items-center gap-8 py-12 px-4 max-w-lg mx-auto">
    <!-- Hero -->
    <div class="text-center space-y-3">
      <h1 class="text-3xl font-bold">{{ t("home.welcome") }}</h1>
      <p class="text-lg text-gray-500 dark:text-gray-400">{{ t("landing.tagline") }}</p>
      <p class="text-sm text-gray-400 dark:text-gray-500">{{ t("landing.description") }}</p>
    </div>

    <!-- Inline login form -->
    <div class="w-full bg-white dark:bg-violet-950 rounded-lg shadow-lg p-6">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ t("landing.getStarted") }}</p>

      <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
        <input
          v-model="auth.email"
          type="email"
          :placeholder="t('common.email')"
          :disabled="auth.isLoading"
          class="disabled:opacity-50 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent"
        />
        <input
          v-model="auth.password"
          type="password"
          :placeholder="t('common.password')"
          :disabled="auth.isLoading"
          class="disabled:opacity-50 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent"
        />

        <div class="flex items-center gap-2">
          <input
            id="landing-remember"
            type="checkbox"
            v-model="auth.rememberPassword"
            :disabled="auth.isLoading"
            class="w-4 h-4"
          />
          <label for="landing-remember" class="text-sm text-gray-600 dark:text-gray-300">
            {{ t("auth.rememberPassword") }}
          </label>
        </div>

        <button
          type="submit"
          :disabled="auth.isLoading"
          class="disabled:opacity-50 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors font-medium"
        >
          {{ auth.isLoading ? t("auth.loggingIn") : t("common.login") }}
        </button>
      </form>

      <!-- Security note -->
      <p class="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
        {{ t("auth.securityNote") }}
      </p>
    </div>

    <!-- Feature highlights -->
    <ul class="text-sm text-gray-500 dark:text-gray-400 space-y-2 text-left w-full">
      <li>&#10003; {{ t("landing.featureAppointments") }}</li>
      <li>&#10003; {{ t("landing.featureOffline") }}</li>
      <li>&#10003; {{ t("landing.featureAI") }}</li>
    </ul>

    <!-- Controls -->
    <div class="flex items-center gap-3">
      <language-switcher />
      <div
        @click="toggleDarkMode"
        class="cursor-pointer p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <img
          v-if="isDark"
          src="https://unpkg.com/lucide-static@latest/icons/sun.svg"
          alt="Light mode"
          class="size-6 dark:invert"
        />
        <img
          v-else
          src="https://unpkg.com/lucide-static@latest/icons/moon.svg"
          alt="Dark mode"
          class="size-6"
        />
      </div>
    </div>
  </div>
</template>
