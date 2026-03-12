<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuth } from "~/composables/useAuth";

const auth = useAuth();
const { t } = useI18n();
const password = ref("");

async function handleLogin() {
  if (await auth.login(auth.email, password.value)) {
    password.value = "";
  }
}

function handleDemoLogin() {
  auth.loginAsDemo();
}
</script>

<template>
  <div class="flex flex-col items-center gap-8 py-12 px-4 max-w-lg md:max-w-3xl mx-auto">
    <!-- Hero -->
    <div class="text-center space-y-3">
      <h1 class="text-3xl font-bold">{{ t("home.welcome") }}</h1>
      <p class="text-lg text-gray-500 dark:text-gray-400">{{ t("landing.tagline") }}</p>
      <p class="text-sm text-gray-400 dark:text-gray-500">{{ t("landing.description") }}</p>
    </div>

    <!-- GIF + Login side by side on md+ -->
    <div class="w-full flex flex-col md:flex-row md:items-stretch gap-6">
      <!-- Preview video -->
      <div
        class="w-fit mx-auto md:mx-0 md:w-auto md:flex-1 rounded-xl overflow-hidden shadow-md border border-neutral-200 dark:border-neutral-700/50"
      >
        <video
          src="/preview_12032026.mp4"
          autoplay
          loop
          muted
          playsinline
          class="md:w-full object-contain max-h-[calc(100dvh-3.5rem-5rem)]"
        />
      </div>

      <!-- Inline login form -->
      <div
        class="w-full md:flex-1 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800/50 rounded-lg shadow-lg p-6"
      >
        <p class="text-sm font-medium text-violet-700 dark:text-violet-300 mb-4">
          {{ t("landing.getStarted") }}
        </p>

        <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
          <input
            v-model="auth.email"
            type="email"
            :placeholder="t('landing.emailPlaceholder')"
            :disabled="auth.isLoading"
            class="disabled:opacity-50 px-3 py-2 border border-violet-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-transparent"
          />
          <input
            v-model="password"
            type="password"
            :placeholder="t('landing.passwordPlaceholder')"
            :disabled="auth.isLoading"
            class="disabled:opacity-50 px-3 py-2 border border-violet-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-transparent"
          />

          <button
            type="submit"
            :disabled="auth.isLoading"
            class="disabled:opacity-50 bg-violet-600 text-white px-4 py-2 rounded-md hover:bg-violet-700 transition-colors font-medium"
          >
            {{ auth.isLoading ? t("auth.loggingIn") : t("landing.loginButton") }}
          </button>

          <div class="relative flex items-center">
            <div class="grow border-t border-violet-200 dark:border-violet-800"></div>
            <span class="mx-3 text-xs text-violet-400 dark:text-violet-500">{{
              t("auth.orSeparator")
            }}</span>
            <div class="grow border-t border-violet-200 dark:border-violet-800"></div>
          </div>

          <button
            type="button"
            @click="handleDemoLogin"
            :disabled="auth.isLoading"
            class="disabled:opacity-50 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 px-4 py-2 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors font-medium"
          >
            {{ t("auth.demoLogin") }}
          </button>
        </form>

        <!-- Security note -->
        <p class="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
          {{ t("auth.securityNote") }}
        </p>
      </div>
    </div>
    <!-- end GIF + Login row -->

    <!-- Feature highlights -->
    <ul class="text-sm text-gray-500 dark:text-gray-400 space-y-2 text-left w-full">
      <li>&#10003; {{ t("landing.featureAppointments") }}</li>
      <li>&#10003; {{ t("landing.featureOffline") }}</li>
      <li>&#10003; {{ t("landing.featureAI") }}</li>
    </ul>
  </div>
</template>
