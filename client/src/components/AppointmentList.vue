<script setup lang="ts">
import AppointmentGroup from "./AppointmentGroup.vue";
import type { Group, GroupedAppointments } from "../composables/useGrouping";

defineProps<{
  groupedAppointments: GroupedAppointments;
  groupBy: Group;
  formatLabel: (key: string) => string;
}>();
</script>

<template>
  <ul class="group-list">
    <li v-for="[groupKey, appointments] in groupedAppointments" :key="groupKey">
      <AppointmentGroup
        :group-key="groupKey"
        :label="formatLabel(groupKey)"
        :appointments="appointments"
        :include-date="groupBy !== 'day'"
      />
    </li>
  </ul>
</template>
