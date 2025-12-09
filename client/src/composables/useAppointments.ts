import { ref } from "vue";
import { getAppointments } from "~/data/appointments";
import type { Appointment } from "@/types";

export function useAppointments() {
  const appointments = ref<Appointment[]>([]);
  const updatedAt = ref<Date | null>(null);
  const isLoading = ref(false);

  async function load(forceRefresh: boolean = false) {
    isLoading.value = true;
    try {
      const payload = await getAppointments(forceRefresh);
      appointments.value = payload.appointments;
      updatedAt.value = payload.updatedAt;
    } finally {
      isLoading.value = false;
    }
  }

  const refresh = () => load(true);

  return { appointments, updatedAt, isLoading, load, refresh };
}
