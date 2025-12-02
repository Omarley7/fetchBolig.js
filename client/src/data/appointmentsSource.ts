import type { Appointment, AppointmentsPayload } from "~/types";

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
    id: 1,
    date: new Date(2025, 11, 12),
    title: "Flinterenden 6,3 tv., 2300 København S",
    start: new Date(2025, 11, 12, 9, 30),
    end: new Date(2025, 11, 12, 10, 0),
    rent: 10100.0,
    downPayment: 70002.0,
    imageUrl: "https://placehold.co/600x400",
  },
  {
    id: 2,
    date: new Date(2025, 11, 12),
    title: "Flinterenden 6,2 th., 2300 København S",
    start: new Date(2025, 11, 12, 10, 0),
    end: new Date(2025, 11, 12, 10, 50),
    rent: 8100.0,
    downPayment: 70002.0,
    imageUrl: "https://placehold.co/400x400",
  },
  {
    id: 3,
    date: new Date(2025, 11, 19),
    title: "Bondehavevej 9,1 mf., 2880 Gladsaxe",
    start: new Date(2025, 11, 19, 9, 30),
    end: new Date(2025, 11, 19, 10, 0),
    rent: 8200.0,
    downPayment: 70002.0,
    imageUrl: "https://placehold.co/400x600",
  },
];
