import type { Appointment, UserData } from "@/types";
import { MOCK_DEAS_APPOINTMENTS } from "./mockData";
import config from "~/config";

// Client-side timeouts (safety net — server timeouts should fire first)
const TIMEOUT_LOGIN = 25_000;         // 25s – covers 2 sequential server requests
const TIMEOUT_APPOINTMENTS = 90_000;  // 90s – orchestrates N×3 server sub-calls

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/** Check if an error is a timeout (client-side abort or server 504) */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.message.includes("504")) return true;
  return false;
}

console.log(config);

export async function fetchAppointments(
  cookies: string,
  includeAll: boolean = false
): Promise<{
  updatedAt: Date;
  appointments: Appointment[];
}> {
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
    const result = await fetchWithTimeout(`${config.backendDomain}/api/appointments/upcoming${queryParam}`, {
      method: "GET",
      headers,
    }, TIMEOUT_APPOINTMENTS);
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

export async function login(email: string, password: string): Promise<UserData | null> {
  try {
    const result = await fetchWithTimeout(`${config.backendDomain}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    }, TIMEOUT_LOGIN);
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
