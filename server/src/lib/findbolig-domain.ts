import type { Appointment, UserData } from "@/types";
import type { AppointmentDetails } from "~/lib/llm/openai-extractor";
import type { ApiOffer, ApiUserData } from "~/types/offers";
import type { ApiResidence, Residence } from "~/types/residences";

export function mapAppointmentToDomain({
  offer,
  residence,
  details,
  position,
}: {
  offer: ApiOffer;
  residence: Residence;
  details: AppointmentDetails;
  position: number | null;
}): Appointment {
  return {
    id: `DEAS-O-${offer.id}`,
    offerId: offer.id,
    title: residence.title,
    date: details.date,
    start: details.startTime,
    end: details.endTime,
    cancelled: details.cancelled,
    residence: {
      adressLine1: residence.addressLine1,
      adressLine2: residence.addressLine2,
      location: residence.location,
    },
    financials: {
      monthlyRentIncludingAconto: residence.monthlyRentIncludingAconto,
      monthlyRentExcludingAconto: residence.monthlyRentExcludingAconto,
      utilityCosts: residence.aconto,
      deposit: residence.deposit,
      prepaidRent: residence.prepaidRent,
      firstPayment: residence.firstPayment,
    },
    imageUrl: residence.images[0] || "",
    images: residence.images,
    blueprints: residence.blueprints,
    position,
  };
}

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

export function apiUserDataToDomain(apiUserData: ApiUserData, cookies?: string[]): UserData {
  return {
    email: apiUserData.email,
    fullName: apiUserData.notifications.fullName,
    cookies: cookies || [],
  };
}