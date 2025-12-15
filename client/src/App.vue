<script setup lang="ts">
import { onMounted } from "vue";
import { useAppointmentsStore } from "~/stores/appointments";
import AppHeader from "~/components/AppHeader.vue";
import AppointmentsList from "~/components/appointment/AppointmentsList.vue";

const store = useAppointmentsStore();

onMounted(() => {
  store.init();
});
</script>

<template>
  <div class="w-full p-6 flex flex-col gap-2">
    <AppHeader />
    <AppointmentsList />
  </div>
</template>
