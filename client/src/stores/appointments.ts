import type { Appointment, AppointmentsPayload } from "@/types";
import { defineStore } from "pinia";
import { ref } from "vue";
import { getAppointments } from "~/data/appointments";

export const useAppointmentsStore = defineStore("appointments", () => {
  const appointments = ref<Appointment[]>([]);
  const updatedAt = ref<Date | null>(null);
  const isLoading = ref(false);
  const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL ?? "";

  async function init() {
    isLoading.value = true;
    try {
      const payload: AppointmentsPayload = await getAppointments(false);
      appointments.value = payload.appointments;
      updatedAt.value = payload.updatedAt;
    } finally {
      isLoading.value = false;
    }
  }

  async function refresh() {
    isLoading.value = true;
    try {
      const payload: AppointmentsPayload = await getAppointments(true);
      appointments.value = payload.appointments;
      updatedAt.value = payload.updatedAt;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    appointments,
    updatedAt,
    isLoading,
    init,
    refresh,
    imageBaseUrl,
  };
});
