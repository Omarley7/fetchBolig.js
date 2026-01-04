import { z } from "zod";

// Shared schemas
const Location = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const Media = z.object({
  id: z.string(),
  path: z.string(),
});

const MediaObject = z.object({
  images: z.array(Media),
  blueprints: z.array(Media),
  panoramas: z.array(Media),
  videos: z.array(Media),
  panoramas360: z.array(Media),
});

const Amount = z.object({
  amount: z.number(),
  currency: z.object({
    symbol: z.string().nullable(),
    isoCode: z.number(),
  }),
});

const Rent = z.object({
  description: z.string(),
  amount: Amount,
  isPartOfRent: z.boolean(),
  isPartOfDeposit: z.boolean(),
  endDate: z.string().nullable(),
  id: z.string(),
  created: z.string(),
  updated: z.string(),
});

const Facility = z.object({
  facilityLocationId: z.string(),
  name: z.string(),
  applicableByUser: z.boolean(),
  id: z.string(),
  created: z.string(),
  updated: z.string(),
});

const FacilityMap = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
});

// API schema from findbolig.nu
export const ApiResidence = z.object({
  entityInfo: z.object({
    location: Location,
    id: z.string(),
    propertyId: z.string(),
    title: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string(),
    types: z.array(z.unknown()),
    isOnWaitingList: z.boolean(),
    isOnInterestList: z.boolean(),
    isFreeNow: z.boolean(),
    media: MediaObject,
    isMembersOnly: z.boolean(),
    isNew: z.boolean(),
    openHouses: z.unknown().nullable(),
    propertyType: z.unknown().nullable(),
  }),
  mediaCategories: MediaObject,
  descriptionModel: z.object({
    title: z.string(),
    description: z.string(),
  }),
  facilitiesModel: z.object({
    _FacilitiesOrder: z.array(z.string()),
    id: z.string(),
    name: z.string(),
    path: z.string(),
    templateId: z.string(),
    displayName: z.string(),
    lastModified: z.string(),
    unPublished: z.boolean(),
    templateName: z.string(),
    residenceFacilities: z.array(Facility),
    propertyFacilities: z.array(Facility),
    facilitiesOrder: z.array(z.unknown()),
    facilitiesMap: z.record(z.string(), FacilityMap),
    language: z.string(),
  }),
  factsModel: z.object({
    title: z.string(),
    id: z.string(),
    name: z.string(),
    path: z.string(),
    templateId: z.string(),
    displayName: z.string(),
    lastModified: z.string(),
    unPublished: z.boolean(),
    templateName: z.string(),
    residence: z.object({
      shortId: z.number(),
      propertyId: z.string(),
      propertyShortId: z.number(),
      propertyTypeName: z.string(),
      projectId: z.string().nullable(),
      projectShortId: z.number().nullable(),
      projectName: z.string().nullable(),
      commune: z.string(),
      city: z.string(),
      postalCode: z.number(),
      postalCodeName: z.string(),
      street: z.string(),
      number: z.number(),
      location: Location,
      letter: z.string().nullable(),
      floor: z.number().nullable(),
      door: z.string().nullable(),
      area: z.number(),
      rooms: z.number(),
      residenceNumber: z.number(),
      facilities: z.array(z.string()),
      organizationId: z.string(),
      company: z.string(),
      organization: z.string(),
      rents: z.array(Rent),
      rentWarnings: z.array(z.object({
        residenceId: z.string(),
        description: z.string(),
        startDate: z.string(),
        amount: Amount,
        rentType: z.number(),
        id: z.string(),
        created: z.string(),
        updated: z.string(),
      })),
      currentRentWarning: z.unknown().nullable(),
      renovationType: z.number(),
      handoverCondition: z.number(),
      media: MediaObject,
      rentalCondition: z.number(),
      furnished: z.number(),
      freeStatuses: z.array(z.object({
        availableFrom: z.string(),
        occupiedDate: z.string(),
        residenceAdvert: z.unknown().nullable(),
        offer: z.unknown().nullable(),
      })),
      freeStatusNotTiedToOfferOrAdvert: z.boolean(),
      rentalPeriod: z.unknown().nullable(),
      types: z.array(z.unknown()),
      monthsOfDeposit: z.number(),
      monthsOfPrepaid: z.number(),
      excludeFromSearch: z.boolean(),
      title: z.string(),
      description: z.string(),
      renovationFinishedDate: z.string().nullable(),
      warningDate: z.string().nullable(),
      warningAmount: z.unknown().nullable(),
      warningText: z.string().nullable(),
      userId: z.string().nullable(),
      applicationType: z.number(),
      availableFromLastUpdated: z.string(),
      availableFrom: z.string(),
      availableTo: z.string().nullable(),
      underRenovation: z.boolean(),
      managedExternally: z.boolean(),
      onlyForStudents: z.boolean(),
      residenceAdvertId: z.string().nullable(),
      residenceAdvertStatus: z.unknown().nullable(),
      activeOfferId: z.string().nullable(),
      isMembersOnly: z.boolean(),
      isHidden: z.boolean(),
      id: z.string(),
      created: z.string(),
      updated: z.string(),
    }),
    property: z.object({
      shortId: z.number(),
      company: z.string(),
      companyNumber: z.number(),
      project: z.unknown().nullable(),
      type: z.string(),
      propertyNumber: z.number(),
      street: z.string(),
      streetNumberFrom: z.string(),
      streetNumberTo: z.string().nullable(),
      postalCode: z.number(),
      postalCodeName: z.string(),
      commune: z.string(),
      name: z.string(),
      year: z.number(),
      residences: z.array(z.string()),
      facilities: z.array(z.string()),
      title: z.string(),
      description: z.string(),
      energyAssessment: z.unknown().nullable(),
      adminStop: z.unknown().nullable(),
      excludeFromSearch: z.boolean(),
      organization: z.string(),
      requiredParameters: z.string(),
      media: MediaObject,
      caretaker: z.unknown().nullable(),
      location: z.string(),
      managedExternally: z.boolean(),
      rentModel: z.number(),
      id: z.string(),
      created: z.string(),
      updated: z.string(),
    }),
    petsAllowed: z.boolean(),
    smokingAllowed: z.boolean(),
    sharingAllowed: z.boolean(),
    owner: z.string(),
    ownerEmail: z.string().nullable(),
    ownerPhone: z.string().nullable(),
    propertyOwner: z.string(),
    residenceTypes: z.array(z.unknown()),
    language: z.string(),
  }),
  financialsModel: z.object({
    monthlyRentIncludingAcontoTitle: z.string(),
    monthlyRentExcludingAcontoTitle: z.string(),
    prepaidRentTitle: z.string(),
    acontoTitle: z.string(),
    depositTitle: z.string(),
    firstPaymentTitle: z.string(),
    rentIncreaseWarning: z.unknown().nullable(),
    acontoClarificationTitle: z.string(),
    id: z.string(),
    name: z.string(),
    path: z.string(),
    templateId: z.string(),
    displayName: z.string(),
    lastModified: z.string(),
    unPublished: z.boolean(),
    templateName: z.string(),
    monthlyRentIncludingAconto: Amount,
    monthlyRentExcludingAconto: Amount,
    prepaidRent: Amount,
    aconto: Amount,
    deposit: Amount,
    firstPayment: Amount,
    correctionRentDescription: z.string().nullable(),
    correctionRentAmount: z.unknown().nullable(),
    rents: z.array(Rent),
    language: z.string(),
  }),
  mapModel: z.object({
    location: Location,
    content: z.object({
      title: z.string(),
      id: z.string(),
      name: z.string(),
      path: z.string(),
      templateId: z.string(),
      displayName: z.string(),
      lastModified: z.string(),
      unPublished: z.boolean(),
      templateName: z.string(),
      language: z.string(),
    }),
  }),
  questionsModel: z.object({
    title: z.string(),
    description: z.string(),
    callToAction: z.string(),
    id: z.string(),
    name: z.string(),
    path: z.string(),
    templateId: z.string(),
    displayName: z.string(),
    lastModified: z.string(),
    unPublished: z.boolean(),
    templateName: z.string(),
    entityId: z.string(),
    entityType: z.string().nullable(),
    entityTitle: z.string().nullable(),
    landlordCanBeContacted: z.boolean(),
    language: z.string(),
  }),
  residenceWorthToKnowModel: z.object({
    componentTheme: z.number(),
    componentIcon: z.number(),
    heading: z.string().nullable(),
    text: z.string().nullable(),
    link: z.string().nullable(),
    linkText: z.string().nullable(),
    faqItems: z.array(z.unknown()),
    id: z.string(),
    name: z.string().nullable(),
    path: z.string().nullable(),
    templateId: z.string(),
    displayName: z.string().nullable(),
    lastModified: z.string(),
    unPublished: z.boolean(),
    language: z.string().nullable(),
    templateName: z.string().nullable(),
  }),
});

export type ApiResidence = z.infer<typeof ApiResidence>;

export const ApiResidencesPage = z.object({
  facets: z.any(),
  totalResults: z.number(),
  page: z.number(),
  pageSize: z.number(),
  results: z.array(ApiResidence),
});

export type ApiResidencesPage = z.infer<typeof ApiResidencesPage>;

// Domain model (used in client and server)
export type Residence = {
  id: string;
  propertyId: string;
  title: string;
  addressLine1: string;
  addressLine2: string;
  area: number;
  rooms: number;
  monthlyRentIncludingAconto: number;
  monthlyRentExcludingAconto: number;
  prepaidRent: number;
  aconto: number;
  deposit: number;
  firstPayment: number;
  availableFrom: string;
  location: {
    latitude: number;
    longitude: number;
  };
  images: string[];
  blueprints: string[];
  petsAllowed: boolean;
  createdAt: Date;
  updatedAt: Date;
};