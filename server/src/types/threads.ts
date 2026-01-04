import { z } from "zod";

// API schema from findbolig.nu
export const ApiMessage = z.object({
  sender: z.object({ id: z.string(), name: z.string() }).optional(),
  receiver: z.object({ id: z.string(), name: z.string() }).optional(),
  body: z.string(),
  status: z.string().optional(),
  attachments: z.array(z.unknown()).optional(),
  id: z.string(),
  created: z.string(), // ISO date string
});

export type ApiMessage = z.infer<typeof ApiMessage>;

// Thread list item (from /api/communications/threads)
export const ApiMessageThread = z.object({
  id: z.string(),
  relatedEntity: z.string().nullable(),
  relatedEntityType: z.string().nullable(),
  relatedEntityState: z.string().nullable(),
  title: z.string(),
  hasUnreadMessages: z.boolean(),
  hasAttachments: z.boolean(),
  lastMessage: ApiMessage.optional(),
});

export type ApiMessageThread = z.infer<typeof ApiMessageThread>;

// Full thread with messages (from /api/communications/messages/thread/...)
export const ApiMessageThreadFull = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(ApiMessage),
  relatedEntity: z.object({
    id: z.string(),
    type: z.string(),
    ownerId: z.string(),
  }).nullable(),
  archived: z.boolean(),
  created: z.string(), // ISO date string
});

export type ApiMessageThreadFull = z.infer<typeof ApiMessageThreadFull>;

export const ApiMessageThreadsPage = z.object({
  hasPublisherRole: z.boolean().optional(),
  hasApplicantRole: z.boolean().optional(),
  totalResults: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  results: z.array(ApiMessageThread),
});

export type ApiMessageThreadsPage = z.infer<typeof ApiMessageThreadsPage>;

// Domain models (used in client and server)
export type Message = {
  id: string;
  threadId: string;
  body: string;
  createdAt: Date;
  author?: string | null;
};

export type MessageThread = {
  id: string;
  relatedEntity: string | null;
  relatedEntityType?: string | null;
  hasUnreadMessages?: boolean;
  hasAttachments?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Message | null;
};