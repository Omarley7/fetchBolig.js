import type { Appointment, AppointmentsPayload } from "@/types";
import { MOCK_DEAS_APPOINTMENTS } from "./mockData";
import config from "~/config";

export async function fetchAppointments(cookies: string, includeAll: boolean = false): Promise<AppointmentsPayload> {
  if (config.useMockData) {
    console.log("Using mock server data");
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { updatedAt: new Date(), appointments: MOCK_DEAS_APPOINTMENTS };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-findbolig-cookies": cookies,
    };

    const queryParam = includeAll ? "?includeAll=true" : "";
    const result = await fetch(`${config.backendDomain}/api/appointments/upcoming${queryParam}`, {
      method: "GET",
      headers,
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

export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; cookies?: string[] }> {
  try {
    const result = await fetch(`${config.backendDomain}/api/auth/login`, {
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
