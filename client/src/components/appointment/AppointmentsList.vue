<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import AppointmentGroup from "~/components/appointment/AppointmentGroup.vue";
import AppointmentCardSkeleton from "~/components/appointment/card/AppointmentCardSkeleton.vue";
import EmptyAppointments from "~/components/appointment/EmptyAppointments.vue";
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

    <!-- Skeleton loading state -->
    <ul v-if="isLoading && !appointments.length" class="w-full">
      <AppointmentCardSkeleton v-for="i in 3" :key="i" />
    </ul>

    <!-- Loaded appointments -->
    <ul v-else class="w-full">
      <AppointmentGroup class="w-full mb-2 border rounded-xl p-1 dark:border-zinc-50/25 dark:bg-white/5 bg-neutral-200"
        v-for="([groupKey, group], index) in groupedAppointments" :key="groupKey" :group-key="groupKey"
        :label="formatLabel(groupKey)" :appointments="group" :include-date="includeDate" :is-first="index === 0" />
    </ul>

    <!-- Empty state (not loading, no results) -->
    <EmptyAppointments v-if="!isLoading && !appointments.length" />
  </div>
</template>