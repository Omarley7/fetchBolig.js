import type { AppointmentsPayload } from "@/types";
import { deserializeAppointmentsPayload } from "~/lib/serialization";
import { fetchAppointments } from "./appointmentsSource";

const STORAGE_KEY = "appointments_cache";

/**
 * Cache-first data strategy:
 * 1. Check LocalStorage first (if !forceRefresh)
 * 2. Parse and deserialize Date objects
 * 3. Fallback to fetch fresh data and cache it
 */
export async function getAppointments(
  forceRefresh: boolean = false,
  cookies: string
): Promise<AppointmentsPayload> {
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

  const payload = await fetchAppointments(cookies);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}
