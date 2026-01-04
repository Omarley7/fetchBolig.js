import { z } from "zod";

// API schema from findbolig.nu
export const ApiOffer = z.object({
  id: z.string(),
  created: z.string(), // ISO date string
  updated: z.string(), // ISO date string
  number: z.number(),
  offerText: z.string(),
  showingText: z.string(),
  internalNote: z.string().nullable(),
  deadline: z.string().nullable(),
  recipients: z.array(z.unknown()).optional(),
  recipientsCount: z.number().optional(),
  winnerId: z.string().nullable(),
  state: z.string(), // 'Awarded', 'AwardedFromExternal', 'RetiredFromAwarded', 'Finished', 'Published', 'Released', 'Changed'
  organizationId: z.string(),
  organization: z.string().optional(),
  companyId: z.string(),
  company: z.string().optional(),
  residenceId: z.string().optional(),
  propertyId: z.string().optional(),
  residenceAddress: z.string().optional(),
  residencePostalCode: z.number().optional(),
  hasUnreadMessages: z.boolean().optional(),
  unreadMessagesCount: z.number().optional(),
  onlyForStudents: z.boolean().optional(),
});

/**
 * Offer states from Findbolig API
 * { name: this.Dictionary.OfferStates.Draft, value: 'Draft' },
          { name: this.Dictionary.OfferStates.Published, value: 'Published' },
          { name: this.Dictionary.OfferStates.Changed, value: 'Changed' },
          { name: this.Dictionary.OfferStates.Finished, value: 'Finished' },
          { name: this.Dictionary.OfferStates.Awarded, value: 'Awarded' },
          { name: this.Dictionary.OfferStates.AwardedExternally, value: 'AwardedExternally' },
          { name: this.Dictionary.OfferStates.Released, value: 'Released' },
          { name: this.Dictionary.OfferStates.RetiredFromAwarded, value: 'RetiredFromAwarded' }
 */

export type ApiOffer = z.infer<typeof ApiOffer>;

export const ApiOffersPage = z.object({
  facets: z.any(),
  totalResults: z.number(),
  page: z.number(),
  pageSize: z.number(),
  results: z.array(ApiOffer),
});

export type ApiOffersPage = z.infer<typeof ApiOffersPage>;

// Domain model (used in client and server)
export type Offer = {
  id: string;
  number?: number;
  residenceAddress?: string | null;
  hasUnreadMessages?: boolean;
  unreadMessagesCount?: number;
  createdAt: Date;
  updatedAt: Date;
};
