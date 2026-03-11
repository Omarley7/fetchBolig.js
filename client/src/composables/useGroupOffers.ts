import type { Offer } from "@/types";
import { computed, type Ref } from "vue";

export type GroupedOffers = { key: string; label: string; offers: Offer[]; isFirst: boolean }[];

export function useGroupOffers(offers: Ref<Offer[]>, t: (key: string) => string) {
  const groupedOffers = computed<GroupedOffers>(() => {
    const awaiting = offers.value
      .filter((o) => o.recipientState === "OfferReceived")
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

    const accepted = offers.value
      .filter((o) => o.recipientState === "OfferAccepted")
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

    const declined = offers.value
      .filter((o) => o.recipientState === "OfferDeclined")
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

    const groups: GroupedOffers = [];

    if (awaiting.length > 0) {
      groups.push({
        key: "awaiting",
        label: t("offers.awaitingResponse"),
        offers: awaiting,
        isFirst: true,
      });
    }

    if (accepted.length > 0) {
      groups.push({
        key: "accepted",
        label: t("offers.accepted"),
        offers: accepted,
        isFirst: groups.length === 0,
      });
    }

    if (declined.length > 0) {
      groups.push({
        key: "declined",
        label: t("offers.declined"),
        offers: declined,
        isFirst: groups.length === 0,
      });
    }

    return groups;
  });

  return { groupedOffers };
}
