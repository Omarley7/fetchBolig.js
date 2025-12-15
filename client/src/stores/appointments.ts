import type { Appointment, AppointmentsPayload } from "@/types";
import { defineStore } from "pinia";
import { ref } from "vue";
import { getAppointments } from "~/data/appointments";
import { login as apiLogin } from "~/data/appointmentsSource";

export const useAppointmentsStore = defineStore(
    "appointments",
    () => {
        const appointments = ref<Appointment[]>([]);
        const updatedAt = ref<Date | null>(null);
        const isLoading = ref(false);
        const email = ref("");
        const password = ref("");

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

        async function login(userEmail: string, userPassword: string) {
            isLoading.value = true;
            try {
                await apiLogin(userEmail, userPassword);
                return true;
            } catch (error) {
                console.error("Failed to login:", error);
                return false;
            } finally {
                isLoading.value = false;
            }
        }

        return {
            appointments,
            updatedAt,
            isLoading,
            email,
            password,
            init,
            refresh,
            login,
        };
    },
    {
        persist: {
            paths: ["email"], // Only persist email, not password
        },
    }
);
