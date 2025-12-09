<script setup lang="ts">
import { ref, watch } from "vue";
import AppointmentCard from "./AppointmentCard.vue";
import type { Appointment } from "@/types";

const props = defineProps<{
  groupKey: string;
  label: string;
  appointments: Appointment[];
  includeDate: boolean;
}>();

const expanded = ref(true);

watch(
  () => props.groupKey,
  () => {
    expanded.value = true;
  }
);

const toggle = () => {
  expanded.value = !expanded.value;
};
</script>

<template>
  <section class="group">
    <button class="group__header" type="button" @click="toggle">
      <h2 class="group__title">{{ label }}</h2>
      <span class="group__chevron" :class="{ 'is-collapsed': !expanded }">⌄</span>
    </button>

    <transition name="collapse">
      <div v-show="expanded" class="group__content">
        <AppointmentCard
          v-for="appointment in appointments"
          :key="appointment.id"
          :appointment="appointment"
          :include-date="includeDate"
        />
      </div>
    </transition>
  </section>
</template>
