<script setup lang="ts">
import type { Appointment } from "@/types";
import { ref, watch } from "vue";
import AppointmentCard from "./card/index.vue";
import BaseCollapse from "~/components/Base/BaseCollapse.vue";
import MapModal from "./MapModal.vue";

const props = defineProps<{
  groupKey: string;
  label: string;
  appointments: Appointment[];
  includeDate?: boolean;
  isFirst?: boolean;
  class?: string;
}>();

const showMap = ref(false);
const expanded = ref(props.isFirst ?? false);
const hasBeenExpanded = ref(expanded.value);

watch(expanded, (val) => {
  if (val) hasBeenExpanded.value = true;
});

function toggleExpanded() {
  expanded.value = !expanded.value;
}
</script>

<template>
  <li :class="props.class">
    <!-- Group header -->
    <div class="flex items-center justify-between cursor-pointer" @click="toggleExpanded">
      <h2 class="text-lg font-semibold pl-1">{{ label }}</h2>
      <img src="https://unpkg.com/lucide-static@latest/icons/chevron-down.svg" alt="Expand/Collapse"
        class="size-5 invert opacity-70 transition-transform duration-200" :class="{ '-rotate-90': !expanded }" />
    </div>

    <!-- Inner loop: appointments in this group -->
    <BaseCollapse v-model:expanded="expanded">
      <!-- height:2px;border-width:0;color:gray;background-color:gray" -->
      <hr class="border-zinc-50/25 m-1" />
      <div class="flex flex-row justify-between p-1">
        <p class="italic text-white/50">Antal: {{ props.appointments.length }}</p>
        <img src="https://unpkg.com/lucide-static@latest/icons/map-pin.svg" alt="Map"
          class="size-5 dark:invert opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
          @click="showMap = true" />
      </div>
      <ul>
        <AppointmentCard v-for="appointment in props.appointments" :key="appointment.id" :appointment="appointment"
          :include-date="props.includeDate" :load-image="hasBeenExpanded" />
      </ul>
    </BaseCollapse>

    <MapModal v-if="showMap" :appointments="props.appointments" @close="showMap = false" />
  </li>
</template>
