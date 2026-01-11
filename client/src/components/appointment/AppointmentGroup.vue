<script setup lang="ts">
import type { Appointment } from "@/types";
import { ref } from "vue";
import AppointmentCard from "./AppointmentCard.vue";
import BaseCollapse from "~/components/Base/BaseCollapse.vue";

const props = defineProps<{
  groupKey: string;
  label: string;
  appointments: Appointment[];
  includeDate?: boolean;
  isFirst?: boolean;
}>();

const expanded = ref(props.isFirst ?? false);

function toggleExpanded() {
  expanded.value = !expanded.value;
}
</script>

<template>
  <li class="w-full mb-4">
    <!-- Group header -->
    <div
      class="flex items-center justify-between mb-2 cursor-pointer"
      @click="toggleExpanded"
    >
      <h2 class="text-lg font-semibold">{{ label }}</h2>
      <img
        src="https://unpkg.com/lucide-static@latest/icons/chevron-down.svg"
        alt="Expand/Collapse"
        class="size-5 invert opacity-70 transition-transform duration-200"
        :class="{ '-rotate-90': !expanded }"
      />
    </div>

    <!-- Inner loop: appointments in this group -->
    <BaseCollapse v-model:expanded="expanded">
      <ul>
        <AppointmentCard
          v-for="appointment in props.appointments"
          :key="appointment.id"
          :appointment="appointment"
          :include-date="props.includeDate"
        />
      </ul>
    </BaseCollapse>
  </li>
</template>
