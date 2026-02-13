export type Appointment = {
  id: string; // DEAS-O-{address-with-dashes} -or- // DEAS-{offerId}
  title: string;
  date: string | null;
  start: string | null; // Appointment start time
  end: string | null; // Appointment end time
  cancelled: boolean;
  residence: Pick<Residence, "addressLine1" | "addressLine2">;
  financials: Financials;
  imageUrl: string;
  images: string[];
  blueprints: string[];
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
  addressLine1: string | null;
  addressLine2: string | null;
  location: string | null; // Latitude/Longitude
  blueprintUrl: string | null;
};

// Might only be for frontend use, will move when verified
export type AppointmentsPayload = {
  updatedAt: Date;
  appointments: Appointment[];
};
