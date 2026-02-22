<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAppointmentsStore } from "~/stores/appointments";
import { useAuth } from "~/composables/useAuth";
import { getCacheAge } from "~/data/appointments";
import AppointmentsList from "~/components/appointment/AppointmentsList.vue";
import StaleDataBanner from "~/components/StaleDataBanner.vue";

const store = useAppointmentsStore();
const auth = useAuth();
const router = useRouter();

onMounted(() => {
    const hasCache = getCacheAge() !== null;

    // Only redirect if not authenticated AND no cached data to show
    if (!auth.isAuthenticated && !hasCache) {
        router.replace("/");
        return;
    }

    store.init();
});

function handleOpenLogin() {
    router.replace("/");
}
</script>

<template>
    <div>
        <StaleDataBanner @open-login="handleOpenLogin" />
        <AppointmentsList />
    </div>
</template>
