<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useAppointmentsStore } from "~/stores/appointments";
import {
  useGroupAppointments,
  type GroupBy,
} from "~/composables/useGroupAppointments";
import GroupBySelector from "~/components/appointment/GroupBySelector.vue";
import AppointmentGroup from "~/components/appointment/AppointmentGroup.vue";

const store = useAppointmentsStore();
const { appointments, isLoading } = storeToRefs(store);

const groupBy = ref<GroupBy>("day");
const { groupedAppointments, formatLabel } = useGroupAppointments(
  appointments,
  groupBy
);

const includeDate = computed(() => groupBy.value !== "day");
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-2 justify-between items-center mb-4">
      <GroupBySelector v-model="groupBy" />
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
    </div>

    <ul class="w-full">
      <AppointmentGroup v-for="([groupKey, group], index) in groupedAppointments" :key="groupKey" :group-key="groupKey"
        :label="formatLabel(groupKey)" :appointments="group" :include-date="includeDate" :is-first="index === 0" />
    </ul>

    <div v-show="!appointments.length" class="w-full flex flex-col p-2 mt-4 text-2xl italic items-center">
      <p v-show="isLoading">{{ $t('appointments.loading') }}</p>
      <p v-show="!isLoading">
        {{ $t('appointments.noAppointments') }}
      </p>
    </div>
  </div>
</template>
