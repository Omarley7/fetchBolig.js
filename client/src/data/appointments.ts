import { deserializeAppointmentsPayload } from "~/lib/serialization";
import { useToastStore } from "~/stores/toast";
import { fetchAppointments } from "./appointmentsSource";

const STORAGE_KEY = "appointments_cache";

export function getCacheAge(): number | null {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    if (!parsed.updatedAt) return null;
    return Date.now() - new Date(parsed.updatedAt).getTime();
  } catch {
    return null;
  }
}

export function isCacheStale(thresholdMs = 24 * 60 * 60 * 1000): boolean {
  const age = getCacheAge();
  if (age === null) return false;
  return age > thresholdMs;
}

/**
 * Cache-first data strategy:
 * 1. Check LocalStorage first (if !forceRefresh)
 * 2. Parse and deserialize Date objects
 * 3. Fallback to fetch fresh data and cache it
 */
export async function getAppointments(
  forceRefresh: boolean = false,
  cookies: string,
  includeAll: boolean = false,
) {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return deserializeAppointmentsPayload(parsed);
      } catch (error) {
        const toast = useToastStore();
        toast.warning("Failed to load cached data, fetching fresh data...");
        // Continue to fallback
      }
    }
  }

  const payload = await fetchAppointments(cookies, includeAll);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}
