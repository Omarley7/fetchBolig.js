<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import AppointmentGroup from "~/components/appointment/AppointmentGroup.vue";
import GroupBySelector from "~/components/appointment/GroupBySelector.vue";
import {
  useGroupAppointments,
  type GroupBy,
} from "~/composables/useGroupAppointments";
import { useAppointmentsStore } from "~/stores/appointments";
import FetchOption from './FetchOption.vue';
const store = useAppointmentsStore();
const { appointments, isLoading } = storeToRefs(store);
const groupBy = ref<GroupBy>("day");
const { groupedAppointments, formatLabel } = useGroupAppointments(
  appointments,
  groupBy,
);
const includeDate = computed(() => groupBy.value !== "day");
</script>
<template>
  <div>
    <div class="flex flex-col gap-3 justify-between items-center mb-2">
      <FetchOption class="w-full" />
      <GroupBySelector class="w-full" v-model="groupBy" />
    </div>
    <ul class="w-full">
      <AppointmentGroup class="w-full mb-2 border rounded-xl p-1 dark:border-zinc-50/25 dark:bg-white/5 bg-neutral-200"
        v-for="([groupKey, group], index) in groupedAppointments" :key="groupKey" :group-key="groupKey"
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