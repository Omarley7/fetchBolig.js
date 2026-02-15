<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useAppointmentsStore } from "~/stores/appointments";
import { useI18n } from "vue-i18n";
import LanguageSwitcher from "~/components/LanguageSwitcher.vue";

const auth = useAuth();
const store = useAppointmentsStore();
const { t } = useI18n();

onMounted(() => {
  store.init();
});
const hasAppointments = computed(() => store.appointments.length > 0);
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-6 py-16 px-4 text-center">

    <!-- Not logged in -->
    <template v-if="!auth.isAuthenticated">
      <h1 class="font-bold">{{ t("home.welcome") }}</h1>
      <p class="text-gray-400">{{ t("home.pleaseLogin") }}</p>
    </template>

    <!-- Logged in -->
    <template v-else-if="auth.isAuthenticated">
      <h1 class="font-bold">{{ t("home.welcomeUser", [auth.name]) }}</h1>
      <router-link to="/appointments"
        class="px-6 py-3 bg-blue-600 text-white! rounded-lg hover:bg-blue-700 transition-colors font-medium">
        {{ t("home.viewAppointments", [store.appointments.length]) }}
      </router-link>
      <p v-if="!hasAppointments" class="text-sm text-gray-400">{{ t("home.fetchLatest") }}</p>
      <p v-else class="text-sm text-gray-400">Last checked {{ store.updatedAt }}</p>
    </template>

    <language-switcher />

  </div>
</template>
