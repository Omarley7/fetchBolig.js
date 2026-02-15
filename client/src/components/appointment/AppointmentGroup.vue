<script setup lang="ts">
import type { Appointment } from "@/types";
import { ref, watch } from "vue";
import AppointmentCard from "./card/index.vue";
import BaseCollapse from "~/components/Base/BaseCollapse.vue";
import MapModal from "./MapModal.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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
      <div class="flex items-center gap-1">
        <h2 class="text-lg font-semibold pl-1">{{ label }}</h2>
        <p v-if="props.appointments.length > 1 && !expanded" class="italic dark:text-white/50"> - {{
          props.appointments.length }}</p>
      </div>
      <img src="https://unpkg.com/lucide-static@latest/icons/chevron-down.svg" alt="Expand/Collapse"
        class="size-5 dark:invert opacity-70 transition-transform duration-200" :class="{ '-rotate-90': !expanded }" />
    </div>

    <!-- Inner loop: appointments in this group -->
    <BaseCollapse v-model:expanded="expanded">
      <!-- height:2px;border-width:0;color:gray;background-color:gray" -->
      <hr class="dark:border-zinc-50/25 m-1" />
      <div v-if="props.appointments.length > 1" class="flex flex-col items-center p-1" @click="showMap = true">
        <div
          class="flex flex-row items-center gap-1.5 border rounded-lg dark:border-zinc-50/25 dark:bg-white/5 bg-neutral-200 p-1.5 mb-2 cursor-pointer select-none hover:scale-[1.02] hover:bg-neutral-300 dark:hover:bg-white/10 active:scale-[0.98] transition-all duration-150">
          <p class="dark:text-white/50">{{ t('appointments.mapOfLocations', { count: props.appointments.length }) }}</p>
          <img src="https://unpkg.com/lucide-static@latest/icons/map-pin.svg" alt="Map"
            class="size-5 dark:invert opacity-70" />

        </div>
      </div>
      <ul>
        <AppointmentCard v-for="appointment in props.appointments" :key="appointment.id" :appointment="appointment"
          :include-date="props.includeDate" :load-image="hasBeenExpanded" />
      </ul>
    </BaseCollapse>

    <MapModal v-if="showMap" :appointments="props.appointments" @close="showMap = false" />
  </li>
</template>
