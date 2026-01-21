<script setup lang="ts">
import { onMounted } from "vue";
import { useAppointmentsStore } from "~/stores/appointments";
import AppHeader from "~/components/AppHeader.vue";
import AppointmentsList from "~/components/appointment/AppointmentsList.vue";
import ToastContainer from "~/components/Base/ToastContainer.vue";

const store = useAppointmentsStore();

onMounted(() => {
  store.init();
});
</script>

<template>
  <div class="w-full flex flex-col gap-2 p-4 pt-2">
    <AppHeader />
    <AppointmentsList />
  </div>
  <ToastContainer />
</template>
