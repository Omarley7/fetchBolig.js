import type { Appointment, AppointmentsPayload } from "@/types";

export async function fetchAppointments(): Promise<AppointmentsPayload> {
  // TODO: Implement real server fetch here
  console.log("Pretending to fetch appointments from server...");
  await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
  console.log("Finished pretending to fetch appointments from server...");

  return { updatedAt: new Date(), appointments: MOCK_SERVER_DATA };
}

// Mock server data
const MOCK_SERVER_DATA: Appointment[] = [
  {
    id: "DEAS-Flinterenden-6,3-tv.,-2300-København-S",
    date: new Date(2025, 11, 12),
    title: "Flinterenden 6,3 tv., 2300 København S",
    start: new Date(2025, 11, 12, 9, 30),
    end: new Date(2025, 11, 12, 10, 0),
    financials: {
      monthlyRentIncludingAconto: 10100.0,
      monthlyRentExcludingAconto: 9000.0,
      utilityCosts: 1100.0,
      deposit: 27000.0,
      prepaidRent: 9000.0,
      firstPayment: 70002.0,
    },
    imageUrl: "https://placehold.co/600x400",
    residence: {
      adressLine1: "Flinterenden 6,3 tv.",
      adressLine2: "2300 København S",
    },
  },
  {
    id: "DEAS-Flinterenden-6,2-th.,-2300-København-S",
    date: new Date(2025, 11, 12),
    title: "Flinterenden 6,2 th., 2300 København S",
    start: new Date(2025, 11, 12, 10, 0),
    end: new Date(2025, 11, 12, 10, 50),
    financials: {
      monthlyRentIncludingAconto: 8100.0,
      monthlyRentExcludingAconto: 7000.0,
      utilityCosts: 1100.0,
      deposit: 21600.0,
      prepaidRent: 7000.0,
      firstPayment: 70002.0,
    },
    imageUrl: "https://placehold.co/400x400",
    residence: {
      adressLine1: "Flinterenden 6,2 th.",
      adressLine2: "2300 København S",
    },
  },
  {
    id: "DEAS-Bondehavevej-9,1-mf.,-2880-Gladsaxe",
    date: new Date(2025, 11, 19),
    title: "Bondehavevej 9,1 mf., 2880 Gladsaxe",
    start: new Date(2025, 11, 19, 9, 30),
    end: new Date(2025, 11, 19, 10, 0),
    financials: {
      monthlyRentIncludingAconto: 8200.0,
      monthlyRentExcludingAconto: 7000.0,
      utilityCosts: 1200.0,
      deposit: 24600.0,
      prepaidRent: 7000.0,
      firstPayment: 70002.0,
    },
    imageUrl: "https://placehold.co/400x600",
    residence: {
      adressLine1: "Bondehavevej 9,1 mf.",
      adressLine2: "2880 Gladsaxe",
    },
  },
];
