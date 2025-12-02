import type { Appointment, AppointmentsPayload } from "~/types.js";

const STORAGE_KEY = "appointments_cache";

/**
 * Converts date strings back to Date objects after JSON.parse
 */
// TODO: T-RPC could make a massive impact here (only for fetching, local storage would still need manual handling)
function deserializeAppointments(data: any[]): Appointment[] {
  return data.map((item) => ({
    ...item,
    date: new Date(item.date),
    start: new Date(item.start),
    end: new Date(item.end),
  }));
}

function deserializeAppointmentsPayload(payload: any): AppointmentsPayload {
  return {
    updatedAt: new Date(payload.updatedAt),
    appointments: deserializeAppointments(payload.appointments ?? []),
  };
}

/**
 * Cache-first data strategy:
 * 1. Check LocalStorage first (if !forceRefresh)
 * 2. Parse and deserialize Date objects
 * 3. Fallback to mock data and cache it
 */
export function getAppointments(
  forceRefresh: boolean = false
): AppointmentsPayload {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return deserializeAppointmentsPayload(parsed);
      } catch (error) {
        console.error("Failed to parse cached appointments:", error);
        // Continue to fallback
      }
    }
  }

  // Fallback: use mock data and cache it
  // TODO: Replace with real server fetch
  const payload: AppointmentsPayload = {
    updatedAt: new Date(),
    appointments: MOCK_SERVER_DATA,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
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
