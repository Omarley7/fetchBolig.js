import type { Appointment, AppointmentsPayload } from "@/types";

/**
 * Deserializes appointments from JSON
 */
export function deserializeAppointments(data: any[]): Appointment[] {
  return data.map((item) => ({
    ...item,
    // Keep date as string (YYYY-MM-DD format), don't convert to Date
    // start and end are already strings (HH:mm format)
  }));
}

export function deserializeAppointmentsPayload(
  payload: any // TODO: T-RPC could help here
): AppointmentsPayload {
  return {
    updatedAt: new Date(payload.updatedAt),
    appointments: deserializeAppointments(payload.appointments ?? []),
  };
}
