import { ApiMessage, ApiMessageThreadItem } from "./api.types.js";

export type Message = {
  id: string;
  threadId: number;
  body: string;
  createdAt: Date;
  author?: string | null;
};

export type MessageThread = {
  id: number;
  relatedEntity: string | null; // FK to Offer.id (offer id is a string)
  relatedEntityType?: string | null;
  hasUnreadMessages?: boolean;
  hasAttachments?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Message | null;
};

export function apiMessageToDomain(m: ApiMessage, threadId: number): Message {
  return {
    id: m.id,
    threadId,
    body: m.body,
    createdAt: new Date(m.created),
    author: m.sender?.name ?? m.receiver?.name ?? null,
  };
}

export function apiThreadToDomain(t: ApiMessageThreadItem): MessageThread {
  return {
    id: t.id,
    relatedEntity: t.relatedEntity,
    relatedEntityType: t.relatedEntityType ?? null,
    hasUnreadMessages: t.hasUnreadMessages ?? false,
    hasAttachments: t.hasAttachments ?? false,
    createdAt: new Date(), // API thread object in provided file doesn't include created/updated; placeholder
    updatedAt: new Date(), // TODO: If API returns created/updated for threads use those fields here
    lastMessage: t.lastMessage ? apiMessageToDomain(t.lastMessage, t.id) : null,
  };
}
