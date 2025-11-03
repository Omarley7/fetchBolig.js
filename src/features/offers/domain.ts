import type { NewOfferRow, OfferRow } from "../../db/schema.js";
import { ApiOffer } from "./api.types.js";

export type Offer = {
  id: string; // API id is a string
  number?: number;
  residenceAddress?: string | null;
  hasUnreadMessages?: boolean;
  unreadMessagesCount?: number;
  createdAt: Date;
  updatedAt: Date;
};

export function apiOfferToDomain(a: ApiOffer[]): Offer[] {
  return a.map((item) => ({
    id: item.id,
    number: item.number,
    residenceAddress: item.residenceAddress ?? null,
    hasUnreadMessages: item.hasUnreadMessages ?? false,
    unreadMessagesCount: item.unreadMessagesCount ?? 0,
    createdAt: new Date(item.created),
    updatedAt: new Date(item.updated),
  }));
}

export function domainOfferToDb(o: Offer): NewOfferRow {
  return {
    id: o.id,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
    number: o.number ?? null,
    residence_address: o.residenceAddress ?? null,
    has_unread_messages: o.hasUnreadMessages ?? false,
    unread_messages_count: o.unreadMessagesCount ?? 0,
  } as unknown as NewOfferRow; // Drizzle's inferred insert shape may accept Date for timestamps
}

export function dbOfferToDomain(r: OfferRow): Offer {
  return {
    id: r.id,
    number: r.number ?? undefined,
    residenceAddress: r.residence_address ?? null,
    hasUnreadMessages: r.has_unread_messages ?? false,
    unreadMessagesCount: r.unread_messages_count ?? 0,
    createdAt:
      r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
    updatedAt:
      r.updated_at instanceof Date ? r.updated_at : new Date(r.updated_at),
  };
}
