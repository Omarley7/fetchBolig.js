<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useAppointmentsStore } from "~/stores/appointments";
import { useI18n } from "vue-i18n";
import { getCacheAge } from "~/data/appointments";
import LandingSection from "~/components/LandingSection.vue";

const auth = useAuth();
const store = useAppointmentsStore();
const { t } = useI18n();

onMounted(() => {
  if (auth.isAuthenticated) store.init();
});

const hasAppointments = computed(() => store.appointments.length > 0);
const firstName = computed(() => auth.name.split(" ")[0] || auth.name);

const lastUpdatedText = computed(() => {
  const age = getCacheAge();
  if (age === null) return null;
  const hours = Math.floor(age / (1000 * 60 * 60));
  const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return t("home.lastUpdated", [`${hours}h ${minutes}m`]);
  return t("home.lastUpdated", [`${minutes}m`]);
});
</script>

<template>
  <!-- Unauthenticated: landing page -->
  <LandingSection v-if="!auth.isAuthenticated" />

  <!-- First-time user: no cached appointments -->
  <div
    v-else-if="!hasAppointments"
    class="flex flex-col items-center justify-center gap-6 py-12 px-4 max-w-md mx-auto text-center"
  >
    <div
      class="w-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 rounded-lg shadow-lg p-8 flex flex-col items-center gap-5"
    >
      <img src="/icons/cloud-download.svg" alt="" class="size-12 dark:invert opacity-70" />
      <h2 class="text-2xl font-bold">{{ t("home.welcomeUser", [firstName]) }}</h2>
      <p class="text-gray-600 dark:text-gray-300">{{ t("home.readyToFetch") }}</p>
      <router-link
        to="/appointments"
        class="px-6 py-3 bg-blue-600 text-white! rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        {{ t("home.fetchAppointments") }}
      </router-link>
      <p class="text-xs text-gray-400 dark:text-gray-500">{{ t("home.noAppointmentsHint") }}</p>
    </div>
  </div>

  <!-- Returning user: has cached appointments -->
  <div v-else class="flex flex-col items-center justify-center gap-6 py-12 px-4 max-w-md mx-auto text-center">
    <div
      class="w-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-neutral-700/50 rounded-lg shadow-lg p-8 flex flex-col items-center gap-5"
    >
      <img src="/icons/calendar-days.svg" alt="" class="size-12 dark:invert opacity-70" />
      <h2 class="text-2xl font-bold">{{ t("home.welcomeBack", [firstName]) }}</h2>
      <p v-if="lastUpdatedText" class="text-sm text-gray-500 dark:text-gray-400">
        {{ lastUpdatedText }}
      </p>
      <router-link
        to="/appointments"
        class="px-6 py-3 bg-blue-600 text-white! rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        {{ t("home.viewAppointments", [store.appointments.length]) }}
      </router-link>
    </div>
  </div>
</template>
