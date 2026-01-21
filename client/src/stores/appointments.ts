import type { Appointment, AppointmentsPayload } from "@/types";
import { defineStore } from "pinia";
import { ref } from "vue";
import { getAppointments } from "~/data/appointments";
import { useAuth } from "~/composables/useAuth";
import config from "~/config";

export const useAppointmentsStore = defineStore("appointments", () => {
  const appointments = ref<Appointment[]>([]);
  const updatedAt = ref<Date | null>(null);
  const isLoading = ref(false);
  const showAllOffers = ref(false);
  const imageBaseUrl = config.imageBaseUrl;

  async function init() {
    isLoading.value = true;
    try {
      const auth = useAuth();
      const payload: AppointmentsPayload = await getAppointments(
        false,
        auth.cookies,
        showAllOffers.value,
      );
      appointments.value = payload.appointments;
      updatedAt.value = payload.updatedAt;
    } finally {
      isLoading.value = false;
    }
  }

  async function refresh() {
    isLoading.value = true;
    try {
      const auth = useAuth();
      const payload: AppointmentsPayload = await getAppointments(
        true,
        auth.cookies,
        showAllOffers.value,
      );
      appointments.value = payload.appointments;
      updatedAt.value = payload.updatedAt;
    } finally {
      isLoading.value = false;
    }
  }

  function toggleShowAllOffers() {
    showAllOffers.value = !showAllOffers.value;
  }

  return {
    appointments,
    updatedAt,
    isLoading,
    showAllOffers,
    init,
    refresh,
    toggleShowAllOffers,
    imageBaseUrl,
  };
});
