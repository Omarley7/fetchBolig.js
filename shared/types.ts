export type Appointment = {
  id: string; // DEAS-O-{address-with-dashes} -or- // DEAS-{offerId}
  offerId: string; // The offer UUID from findbolig.nu
  title: string;
  date: string | null;
  start: string | null; // Appointment start time
  end: string | null; // Appointment end time
  cancelled: boolean;
  residence: Pick<Residence, "adressLine1" | "adressLine2" | "location">; // Provider spelled it wrong.
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
  adressLine1: string | null;
  adressLine2: string | null;
  location: { latitude: number; longitude: number } | null; // Latitude/Longitude
  blueprintUrl: string | null;
};

export type UserData = {
  email: string;
  fullName: string;
  cookies?: string[];
};