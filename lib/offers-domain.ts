import type { ApiOffer, Offer } from "~/types/offers.js";

/**
 * Transform API offer data to domain model
 */
export function apiOfferToDomain(apiOffers: ApiOffer[]): Offer[] {
  return apiOffers.map((item) => ({
    id: item.id,
    number: item.number,
    residenceAddress: item.residenceAddress ?? null,
    hasUnreadMessages: item.hasUnreadMessages ?? false,
    unreadMessagesCount: item.unreadMessagesCount ?? 0,
    createdAt: new Date(item.created),
    updatedAt: new Date(item.updated),
  }));
}
