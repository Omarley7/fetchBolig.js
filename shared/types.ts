export type Appointment = {
  id: string; // DEAS-O-{address-with-dashes} -or- // DEAS-{offerId}
  title: string;
  date: Date;
  start: Date | null; // Appointment start time
  end: Date | null; // Appointment end time
  residence: Pick<Residence, "adressLine1" | "adressLine2">;
  financials: Financials;
  imageUrl: string;
};

export type Financials = {
  monthlyRentIncludingAconto: number;
  monthlyRentExcludingAconto: number;
  utilityCosts: number;
  deposit: number;
  prepaidRent: number;
  firstPayment: number;
};

export type Residence = {
  id: string; // DEAS-R-{address-with-dashes} -or- // DEAS-{residenceId}
  adressLine1: string | null;
  adressLine2: string | null;
  location: string | null; // Latitude/Longitude
  blueprintUrl: string | null;
};

// Might only be for frontend use, will move when verified
export type AppointmentsPayload = {
  updatedAt: Date;
  appointments: Appointment[];
};
