import type { Appointment, AppointmentsPayload } from "@/types";
import { MOCK_DEAS_APPOINTMENTS } from "./mockData";
const domain = import.meta.env.VITE_BACKEND_DOMAIN ?? "http://localhost:3000";

export async function fetchAppointments(): Promise<AppointmentsPayload> {
  if (import.meta.env.VITE_USE_MOCK_DATA === "true") {
    console.log("Using mock server data");
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { updatedAt: new Date(), appointments: MOCK_DEAS_APPOINTMENTS };
  }

  try {
    const result = await fetch(`${domain}/api/appointments/upcoming`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
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
    if (data?.success) {
      return true;
    } else return false;
  } catch (error) {
    console.error("Failed to login:", error);
    throw error;
  }
}
