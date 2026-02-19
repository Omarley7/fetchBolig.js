import type { Appointment } from "@/types";

/**
 * Deserializes appointments from JSON
 */
export function deserializeAppointments(data: any[]): Appointment[] {
  return data.map((item) => ({
    ...item,
    // Keep date as string (YYYY-MM-DD format), don't convert to Date
    // start and end are already strings (HH:mm format)
    // Derive offerId from id if missing (e.g. stale cache from before offerId was added)
    offerId: item.offerId ?? item.id?.replace(/^DEAS-O-/, "") ?? "",
  }));
}

export function deserializeAppointmentsPayload(
  payload: any // TODO: T-RPC could help here
): { updatedAt: Date; appointments: Appointment[] } {
  return {
    updatedAt: new Date(payload.updatedAt),
    appointments: deserializeAppointments(payload.appointments ?? []),
  };
}
