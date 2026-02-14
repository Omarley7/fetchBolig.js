<script setup lang="ts">
import { onMounted } from "vue";
import { useAppointmentsStore } from "~/stores/appointments";
import AppointmentsList from "~/components/appointment/AppointmentsList.vue";

const store = useAppointmentsStore();

onMounted(() => {
    store.init();
});
</script>

<template>
    <AppointmentsList />
</template>
