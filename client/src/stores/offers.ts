import type { Offer, RecipientState } from "@/types";
import { defineStore, storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { getOffers, isOffersCacheStale } from "~/data/offers";
import { acceptOffer as apiAcceptOffer, declineOffer as apiDeclineOffer } from "~/data/offersSource";
import { handleApiError } from "~/data/appointmentsSource";
import { useAuth } from "~/composables/useAuth";
import { useToastStore } from "~/stores/toast";
import { useI18n } from "~/i18n";
import config from "~/config";
import { MOCK_OFFERS } from "~/data/mockData";

export const useOffersStore = defineStore("offers", () => {
  const offers = ref<Offer[]>([]);
  const updatedAt = ref<Date | null>(null);
  const isLoading = ref(false);
  const needsRefresh = ref(false);
  const sessionExpired = ref(false);
  const isActioning = ref(false);

  async function init() {
    const auth = useAuth();

    if (auth.isDemo) {
      isLoading.value = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      offers.value = MOCK_OFFERS;
      updatedAt.value = new Date();
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    try {
      const cached = await getOffers(false);
      offers.value = cached.offers;
      updatedAt.value = cached.updatedAt;

      if (!auth.isAuthenticated) {
        sessionExpired.value = true;
        return;
      }

      if (isOffersCacheStale()) {
        const sessionValid = await auth.ensureSession();
        if (sessionValid) {
          needsRefresh.value = true;
        } else {
          sessionExpired.value = true;
        }
      }
    } catch {
      if (!auth.isAuthenticated) return;
      try {
        const payload = await getOffers(true);
        offers.value = payload.offers;
        updatedAt.value = payload.updatedAt;
      } catch (error) {
        handleApiError(error, useToastStore(), useI18n().t, "Failed to load offers");
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function refresh() {
    isLoading.value = true;
    needsRefresh.value = false;
    const auth = useAuth();

    if (auth.isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      offers.value = MOCK_OFFERS;
      updatedAt.value = new Date();
      isLoading.value = false;
      return;
    }

    try {
      const payload = await getOffers(true);
      offers.value = payload.offers;
      updatedAt.value = payload.updatedAt;
    } catch (error) {
      const is401 = error instanceof Error && error.message.includes("401");
      if (is401) {
        const recovered = await auth.ensureSession();
        if (recovered) {
          try {
            const payload = await getOffers(true);
            offers.value = payload.offers;
            updatedAt.value = payload.updatedAt;
            return;
          } catch {
            // retry also failed
          }
        } else {
          sessionExpired.value = true;
          return;
        }
      }
      handleApiError(error, useToastStore(), useI18n().t, "Failed to refresh offers");
    } finally {
      isLoading.value = false;
    }
  }

  async function acceptOffer(offerId: string): Promise<boolean> {
    const toast = useToastStore();
    const { t } = useI18n();
    isActioning.value = true;
    try {
      const newState = await apiAcceptOffer(offerId);
      updateLocalOfferState(offerId, newState);
      toast.success(t("offers.acceptSuccess"));
      return true;
    } catch (error) {
      handleApiError(error, toast, t, t("offers.actionFailed"));
      return false;
    } finally {
      isActioning.value = false;
    }
  }

  async function declineOffer(offerId: string): Promise<boolean> {
    const toast = useToastStore();
    const { t } = useI18n();
    isActioning.value = true;
    try {
      const newState = await apiDeclineOffer(offerId);
      updateLocalOfferState(offerId, newState);
      toast.success(t("offers.declineSuccess"));
      return true;
    } catch (error) {
      handleApiError(error, toast, t, t("offers.actionFailed"));
      return false;
    } finally {
      isActioning.value = false;
    }
  }

  function updateLocalOfferState(offerId: string, newState: RecipientState) {
    const offer = offers.value.find((o) => o.id === offerId);
    if (offer) {
      offer.recipientState = newState;
    }
  }

  let pendingRefresh = false;

  async function handleRefresh() {
    const auth = useAuth();
    if (!auth.isAuthenticated) {
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

  function getImageUrl(imagePath: string): string {
    return `${config.imageBaseUrl}${imagePath}`;
  }

  return {
    offers,
    updatedAt,
    isLoading,
    needsRefresh,
    sessionExpired,
    isActioning,
    init,
    refresh,
    handleRefresh,
    acceptOffer,
    declineOffer,
    getImageUrl,
  };
});
