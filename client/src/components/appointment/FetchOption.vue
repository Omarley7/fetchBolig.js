<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";
import { useAppointmentsStore } from "~/stores/appointments";
import { formatUpdatedAt } from "~/lib/formatters";

const auth = useAuth();
const store = useAppointmentsStore();
</script>

<template>
  <div class="flex flex-row gap-2 justify-between border border-zinc-500 rounded-md bg-white/2 p-2">
    <div class="grow self-end mb-2">
      <button @click="store.toggleShowAllOffers()" :disabled="store.isLoading"
        class="px-4 py-2 rounded-md text-sm font-medium transition-colors" :class="{
          'bg-blue-600 text-white hover:bg-blue-700': store.showAllOffers,
          'bg-gray-200 text-gray-700 hover:bg-gray-300': !store.showAllOffers,
          'opacity-50 cursor-not-allowed': store.isLoading
        }">
        {{ store.showAllOffers ? 'Alle' : 'Aktive' }}
      </button>
    </div>
    <div v-if="auth.isAuthenticated" class="flex flex-col">
      <button class="flex justify-center items-center gap-2" type="button" :disabled="store.isLoading"
        aria-label="Opdater aftaler" @click="store.refresh()">
        <img v-show="store.isLoading" src="https://unpkg.com/lucide-static@latest/icons/refresh-ccw.svg" alt="Opdater"
          class="size-4 invert opacity-70 animate-spin" />
        <span class="font-light text-sm text-gray-400 italic whitespace-pre-line">
          {{ formatUpdatedAt(store.updatedAt) }}
        </span>
      </button>
    </div>
  </div>
</template>
