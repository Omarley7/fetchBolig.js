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

  <!-- Authenticated: welcome + appointments link -->
  <div v-else class="flex flex-col items-center justify-center gap-6 py-12 text-center">
    <h1 class="font-bold">{{ t("home.welcomeUser", [auth.name]) }}</h1>
    <router-link
      to="/appointments"
      class="px-6 py-3 bg-blue-600 text-white! rounded-lg hover:bg-blue-700 transition-colors font-medium"
    >
      {{ t("home.viewAppointments", [store.appointments.length]) }}
    </router-link>
    <p v-if="!hasAppointments" class="text-sm text-gray-400">{{ t("home.fetchLatest") }}</p>
    <p v-else-if="lastUpdatedText" class="text-sm text-gray-400">{{ lastUpdatedText }}</p>
  </div>
</template>
