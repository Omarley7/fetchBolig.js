import type { ApiResidence, Residence } from "~/types/residences.js";

export function apiResidenceToDomain(apiResidence: ApiResidence): Residence {
  return {
    id: apiResidence.entityInfo.id,
    propertyId: apiResidence.entityInfo.propertyId,
    title: apiResidence.entityInfo.title,
    addressLine1: apiResidence.entityInfo.addressLine1,
    addressLine2: apiResidence.entityInfo.addressLine2,
    area: apiResidence.factsModel.residence.area,
    rooms: apiResidence.factsModel.residence.rooms,
    monthlyRentIncludingAconto:
      apiResidence.financialsModel.monthlyRentIncludingAconto.amount,
    monthlyRentExcludingAconto:
      apiResidence.financialsModel.monthlyRentExcludingAconto.amount,
    prepaidRent: apiResidence.financialsModel.prepaidRent.amount,
    aconto: apiResidence.financialsModel.aconto.amount,
    deposit: apiResidence.financialsModel.deposit.amount,
    firstPayment: apiResidence.financialsModel.firstPayment.amount,
    availableFrom: apiResidence.factsModel.residence.availableFrom,
    location: apiResidence.entityInfo.location,
    images: apiResidence.entityInfo.media.images.map((image) => image.path),
    blueprints: apiResidence.entityInfo.media.blueprints.map(
      (blueprint) => blueprint.path
    ),
    petsAllowed: apiResidence.factsModel.petsAllowed,
    createdAt: new Date(apiResidence.factsModel.residence.created),
    updatedAt: new Date(apiResidence.factsModel.residence.updated),
  };
}
