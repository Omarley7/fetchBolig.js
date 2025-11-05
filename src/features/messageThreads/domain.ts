import type { NewMessageThreadRow } from "../../db/schema.js";
import { ApiMessage, ApiMessageThreadItem } from "./api.types.js";

export type Message = {
  id: string;
  threadId: string;
  body: string;
  createdAt: Date;
  author?: string | null;
};

export type MessageThread = {
  id: string;
  relatedEntity: string | null; // FK to Offer.id (offer id is a string)
  relatedEntityType?: string | null;
  hasUnreadMessages?: boolean;
  hasAttachments?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Message | null;
};

export function apiMessageToDomain(m: ApiMessage, threadId: string): Message {
  return {
    id: m.id,
    threadId,
    body: m.body,
    createdAt: new Date(m.created),
    author: m.sender?.name ?? m.receiver?.name ?? null,
  };
}

export function apiThreadToDomain(
  results: ApiMessageThreadItem[]
): MessageThread[] {
  return results.map((t) => ({
    id: t.id,
    relatedEntity: t.relatedEntity,
    relatedEntityType: t.relatedEntityType ?? null,
    hasUnreadMessages: t.hasUnreadMessages ?? false,
    hasAttachments: t.hasAttachments ?? false,
    createdAt: new Date(), // API thread object in provided file doesn't include created/updated; placeholder
    updatedAt: new Date(), // TODO: If API returns created/updated for threads use those fields here
    lastMessage: t.lastMessage ? apiMessageToDomain(t.lastMessage, t.id) : null,
  }));
}

export function domainThreadToDb(t: MessageThread): NewMessageThreadRow {
  return {
    id: t.id,
    related_entity: t.relatedEntity ?? null,
    related_entity_type: t.relatedEntityType ?? null,
    related_entity_state: null,
    title: null,
    has_unread_messages: t.hasUnreadMessages ?? false,
    has_attachments: t.hasAttachments ?? false,
    last_message: t.lastMessage
      ? {
          id: t.lastMessage.id,
          thread_id: t.lastMessage.threadId,
          body: t.lastMessage.body,
          created_at: t.lastMessage.createdAt.toISOString(),
          author: t.lastMessage.author ?? null,
        }
      : null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  } as unknown as NewMessageThreadRow;
}
