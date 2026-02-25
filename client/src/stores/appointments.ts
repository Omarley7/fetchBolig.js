import type { Appointment } from "@/types";
import { defineStore, storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { getAppointments, isCacheStale } from "~/data/appointments";
import { handleApiError } from "~/data/appointmentsSource";
import { useAuth } from "~/composables/useAuth";
import { useToastStore } from "~/stores/toast";
import { useI18n } from "~/i18n";
import config from "~/config";

export const useAppointmentsStore = defineStore("appointments", () => {
  const appointments = ref<Appointment[]>([]);
  const updatedAt = ref<Date | null>(null);
  const isLoading = ref(false);
  const showAllOffers = ref(false);
  const needsRefresh = ref(false);
  const sessionExpired = ref(false);

  async function init() {
    const auth = useAuth();
    if (!auth.isAuthenticated) return;

    isLoading.value = true;
    try {
      // Always load from cache first for instant display
      const cached = await getAppointments(false, auth.cookies, showAllOffers.value);
      appointments.value = cached.appointments;
      updatedAt.value = cached.updatedAt;

      // Check if cache is stale
      if (isCacheStale()) {
        const sessionValid = await auth.ensureSession();
        if (sessionValid) {
          needsRefresh.value = true;
        } else {
          sessionExpired.value = true;
        }
      }
    } catch {
      // No cache available — try to fetch fresh if authenticated
      try {
        const payload = await getAppointments(true, auth.cookies, showAllOffers.value);
        appointments.value = payload.appointments;
        updatedAt.value = payload.updatedAt;
      } catch (error) {
        handleApiError(error, useToastStore(), useI18n().t, "Failed to load appointments");
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function refresh() {
    isLoading.value = true;
    needsRefresh.value = false;
    const auth = useAuth();
    try {
      const payload = await getAppointments(
        true,
        auth.cookies,
        showAllOffers.value,
      );
      appointments.value = payload.appointments;
      updatedAt.value = payload.updatedAt;
    } catch (error) {
      // If we got a 401, attempt re-auth and retry once
      const is401 = error instanceof Error && error.message.includes("401");
      if (is401) {
        const recovered = await auth.ensureSession();
        if (recovered) {
          try {
            const payload = await getAppointments(true, auth.cookies, showAllOffers.value);
            appointments.value = payload.appointments;
            updatedAt.value = payload.updatedAt;
            return;
          } catch {
            // retry also failed — fall through to error handling
          }
        } else {
          sessionExpired.value = true;
          return;
        }
      }
      handleApiError(error, useToastStore(), useI18n().t, "Failed to refresh appointments");
    } finally {
      isLoading.value = false;
    }
  }

  function dismissRefresh() {
    needsRefresh.value = false;
  }

  let pendingRefresh = false;

  async function handleRefresh() {
    const auth = useAuth();
    if (!auth.isAuthenticated && !auth.cookies) {
      pendingRefresh = true;
      auth.showLoginModal = true;
      return;
    }
    const sessionValid = await auth.ensureSession();
    if (!sessionValid) {
      sessionExpired.value = true;
      needsRefresh.value = false;
      return;
    }
    await refresh();
  }

  // When the user logs back in, clear expired banner and fulfill any pending refresh
  const { isAuthenticated } = storeToRefs(useAuth());
  watch(isAuthenticated, (loggedIn) => {
    if (loggedIn) {
      sessionExpired.value = false;
      if (pendingRefresh) {
        pendingRefresh = false;
        refresh();
      }
    }
  });

  function toggleShowAllOffers() {
    showAllOffers.value = !showAllOffers.value;
  }

  function getImageUrl(imagePath: string): string {
    return `${config.imageBaseUrl}${imagePath}`;
  }

  return {
    appointments,
    updatedAt,
    isLoading,
    showAllOffers,
    needsRefresh,
    sessionExpired,
    init,
    refresh,
    dismissRefresh,
    handleRefresh,
    toggleShowAllOffers,
    getImageUrl,
  };
});
