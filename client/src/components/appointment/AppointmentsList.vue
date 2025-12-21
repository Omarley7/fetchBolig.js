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
    <GroupBySelector v-model="groupBy" />

    <ul class="w-full">
      <AppointmentGroup
        v-for="[groupKey, group] in groupedAppointments"
        :key="groupKey"
        :group-key="groupKey"
        :label="formatLabel(groupKey)"
        :appointments="group"
        :include-date="includeDate"
      />
    </ul>

    <div
      v-show="!appointments.length"
      class="w-full flex flex-col p-2 mt-4 text-2xl italic items-center"
    >
      <p v-show="isLoading">Indlæser kommende aftaler...</p>
      <p v-show="!isLoading">
        Ingen aftaler fundet, benyt venligst findbolig.nu til at søge efter
        boliger...
      </p>
    </div>
  </div>
</template>
