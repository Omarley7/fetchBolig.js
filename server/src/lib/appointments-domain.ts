import type { Appointment } from "@/types";

import type { AppointmentDetails } from "~/lib/llm/openai-extractor";
import type { ApiOffer } from "~/types/offers";
import type { Residence } from "~/types/residences";

export function mapAppointmentToDomain({
  offer,
  residence,
  details,
}: {
  offer: ApiOffer;
  residence: Residence;
  details: AppointmentDetails;
}): Appointment {
  return {
    id: `DEAS-O-${offer.id}`,
    title: residence.title,
    date: details.date,
    start: details.startTime,
    end: details.endTime,
    cancelled: details.cancelled,
    residence: {
      adressLine1: residence.addressLine1,
      adressLine2: residence.addressLine2,
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
  };
}
