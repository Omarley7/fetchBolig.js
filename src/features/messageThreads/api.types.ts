import { z } from "zod";

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

export const ApiMessageThreadItem = z.object({
  id: z.string(),
  relatedEntity: z.string().nullable(),
  relatedEntityType: z.string().nullable(),
  relatedEntityState: z.string().nullable(),
  title: z.string(),
  hasUnreadMessages: z.boolean(),
  hasAttachments: z.boolean(),
  lastMessage: ApiMessage.optional(),
});

export type ApiMessageThreadItem = z.infer<typeof ApiMessageThreadItem>;

export const ApiMessageThreadsPage = z.object({
  hasPublisherRole: z.boolean().optional(),
  hasApplicantRole: z.boolean().optional(),
  totalResults: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  results: z.array(ApiMessageThreadItem),
});

export type ApiMessageThreadsPage = z.infer<typeof ApiMessageThreadsPage>;
