<script setup lang="ts">
import { useAppointmentsStore } from "~/stores/appointments";
const store = useAppointmentsStore();
</script>

<template>
    <div class="grow self-end mb-2">
        <button @click="store.toggleShowAllOffers()" :disabled="store.isLoading"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors" :class="{
                'bg-blue-600 text-white hover:bg-blue-700': store.showAllOffers,
                'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600': !store.showAllOffers,
                'opacity-50 cursor-not-allowed': store.isLoading
            }">
            {{ store.showAllOffers ? 'Alle' : 'Aktive' }}
        </button>
    </div>
</template>
