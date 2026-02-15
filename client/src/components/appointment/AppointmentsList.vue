<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  useGroupAppointments,
  type GroupBy,
} from "~/composables/useGroupAppointments";
import GroupBySelector from "~/components/appointment/GroupBySelector.vue";
import AppointmentGroup from "~/components/appointment/AppointmentGroup.vue";
import FetchOption from './FetchOption.vue'
import { useAppointmentsStore } from "~/stores/appointments";

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
    <div class="flex flex-col gap-2 justify-between items-center mb-1">
      <FetchOption
        class="flex w-full items-center justify-between border rounded-lg border-zinc-50/25 bg-white/5 p-2" />
      <GroupBySelector v-model="groupBy" />
    </div>

    <ul class="w-full">
      <AppointmentGroup class="w-full mb-2 border border-zinc-50/25 bg-white/5 rounded-xl p-1"
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
