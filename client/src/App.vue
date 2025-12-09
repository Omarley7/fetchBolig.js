<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import AppointmentList from "./components/AppointmentList.vue";
import GroupBySwitcher from "./components/GroupBySwitcher.vue";
import { useAppointments } from "./composables/useAppointments";
import { useGrouping, type Group } from "./composables/useGrouping";
import { formatUpdatedAt } from "./utils/formatters";

const GROUP_STORAGE_KEY = "groupByPreference";

const initialGroup = (): Group => {
  if (typeof localStorage === "undefined") return "day";
  const stored = localStorage.getItem(GROUP_STORAGE_KEY) as Group | null;
  return stored ?? "day";
};

const groupBy = ref<Group>(initialGroup());

const { appointments, isLoading, updatedAt, load, refresh } = useAppointments();
const { groupedAppointments, formatLabel } = useGrouping(appointments, groupBy);

const updatedLabel = computed(() => formatUpdatedAt(updatedAt.value));

watch(
  groupBy,
  (value) => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(GROUP_STORAGE_KEY, value);
  },
  { immediate: true }
);

onMounted(() => {
  load(false);
});

const hasAppointments = computed(() => groupedAppointments.value.length > 0);
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">Kommende aftaler</h1>
      <button
        class="refresh"
        type="button"
        @click="refresh"
        :disabled="isLoading"
        aria-label="Opdater aftaler"
      >
        <span v-if="isLoading" class="refresh__spinner" aria-hidden="true" />
        <span class="refresh__label">{{ updatedLabel }}</span>
      </button>
    </header>

    <section class="panel">
      <GroupBySwitcher v-model="groupBy" />

      <AppointmentList
        v-if="hasAppointments"
        :grouped-appointments="groupedAppointments"
        :group-by="groupBy"
        :format-label="(key: string) => formatLabel(key, groupBy.value)"
      />

      <div v-else class="empty">
        <p v-if="isLoading">Indlæser kommende aftaler...</p>
        <p v-else>Ingen aftaler fundet, benyt venligst findbolig.nu til at søge efter boliger...</p>
      </div>
    </section>
  </main>
</template>
