import type { Appointment, AppointmentsPayload } from "@/types";

export async function fetchAppointments(): Promise<AppointmentsPayload> {
  const domain = import.meta.env.VITE_DOMAIN ?? "http://localhost:3000";

  try {
    const result = await fetch(
      `${domain}/api/appointments/upcoming`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!result.ok) {
      throw new Error(`Failed to fetch appointments: ${result.status}`);
    }
    const data = await result.json();
    return { updatedAt: new Date(), appointments: data as Appointment[] };
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    throw error;
  }
}

export async function login(email: string, password: string) {
  const domain = import.meta.env.VITE_DOMAIN ?? "http://localhost:3000";
  console.log(domain);

  try {
    const result = await fetch(`${domain}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });
    if (!result.ok) {
      throw new Error(`Failed to login: ${result.status}`);
    }
    const data = await result.json();
    return data;
  } catch (error) {
    console.error("Failed to login:", error);
    throw error;
  }
}

// Mock server data
// @ts-ignore: TS6133
const MOCK_SERVER_DATA: Appointment[] = [
  {
    id: "DEAS-Flinterenden-6,3-tv.,-2300-København-S",
    date: "2025-12-12",
    title: "Flinterenden 6,3 tv., 2300 København S",
    start: "09:30",
    end: "10:00",
    cancelled: false,
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
    date: "2025-12-12",
    title: "Flinterenden 6,2 th., 2300 København S",
    start: "10:00",
    end: "10:50",
    cancelled: false,
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
    date: "2025-12-19",
    title: "Bondehavevej 9,1 mf., 2880 Gladsaxe",
    start: "09:30",
    end: "10:00",
    cancelled: false,
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
