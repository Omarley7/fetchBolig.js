<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";
import { useAppointmentsStore } from "~/stores/appointments";
import { formatUpdatedAt } from "~/lib/formatters";
import BaseSwitch from "~/components/Base/BaseSwitch.vue";

const props = defineProps<{
  class?: string;
}>();

const auth = useAuth();
const store = useAppointmentsStore();
</script>

<template>
  <div :class="props.class">
    <!-- Aktive / Alle toggle -->
    <div class="flex flex-col">
      {{ formatUpdatedAt(store.updatedAt) }}
      <BaseSwitch v-if="auth.isAuthenticated" v-model="store.showAllOffers" :disabled="store.isLoading"
        label-false="Aktive" label-true="Alle" />
    </div>

    <!-- Refresh -->
    <div v-if="auth.isAuthenticated" :disabled="store.isLoading" class="flex items-center gap-2"
      aria-label="Opdater aftaler" @click="store.refresh()">
      <img v-show="store.isLoading" src="https://unpkg.com/lucide-static@latest/icons/refresh-ccw.svg" alt="Opdater"
        class="size-8 dark:invert opacity-70 animate-spin cursor-progress" />
      <span class="text-sm font-light cursor-pointer hover:bg-white/20 active:bg-white/30 rounded-4xl p-2"
        v-show="!store.isLoading">
        <img src="https://unpkg.com/lucide-static@latest/icons/cloud-download.svg" alt="Download"
          class="size-8 dark:invert opacity-70" />
      </span>
    </div>
  </div>
</template>
