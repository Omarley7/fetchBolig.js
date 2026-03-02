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

export async function getAppointments(
  forceRefresh: boolean = false,
  includeAll: boolean = false,
) {
  if (!forceRefresh) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return deserializeAppointmentsPayload(parsed);
      } catch (error) {
        const toast = useToastStore();
        toast.warning("Failed to load cached data, fetching fresh data...");
      }
    }
  }

  const payload = await fetchAppointments(includeAll);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}
