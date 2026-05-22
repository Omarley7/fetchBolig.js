import { z } from "zod";

const ApiResidenceApplication = z.object({
  residenceId: z.string(),
  propertyId: z.string(),
  companyId: z.string(),
  userId: z.string(),
  inactiveDate: z.string().nullable(),
  status: z.enum(["Active", "Passive"]),
  created: z.string(),
});

export type ApiResidenceApplication = z.infer<typeof ApiResidenceApplication>;

// Property search results return many fields; only the ones we actually consume are typed strictly.
// The rest are kept as `passthrough` to avoid breaking on upstream additions.
const ApiPropertySearchResult = z.object({
  id: z.string(),                       // propertyId
  shortId: z.number(),
  name: z.string(),
  street: z.string(),
  number: z.union([z.number(), z.string()]).nullable().optional(),
  postalCode: z.number(),
  postalCodeName: z.string(),
  city: z.string(),
  propertyAddress: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  media: z
    .object({
      images: z.array(z.string()),
      blueprints: z.array(z.string()),
    })
    .passthrough(),
  companyLogo: z.string().nullable().optional(),
  organizationLogo: z.string().nullable().optional(),
  propertyOrganizationId: z.string(),
  propertyOrganizationName: z.string(),
  propertyCompanyId: z.string(),
  propertyCompanyName: z.string(),
  residencesCount: z.number(),
  minRooms: z.number(),
  maxRooms: z.number(),
  minArea: z.number(),
  maxArea: z.number(),
  minRent: z.number(),
  maxRent: z.number(),
}).passthrough();

export type ApiPropertySearchResult = z.infer<typeof ApiPropertySearchResult>;

const ApiPropertySearchPage = z.object({
  facets: z.any(),
  totalResults: z.number(),
  page: z.number(),
  pageSize: z.number(),
  results: z.array(ApiPropertySearchResult),
});

export type ApiPropertySearchPage = z.infer<typeof ApiPropertySearchPage>;

// Position-for-property — exact shape unknown until first call.
// The mapper handles either a bare number, or an array of {residenceId, position}.
// Define a permissive type and narrow at the mapper.
export type ApiPositionForProperty =
  | number
  | { residenceId: string; position: number }[]
  | { position: number }
  | unknown;
