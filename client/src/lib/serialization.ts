import type { Appointment, AppointmentsPayload } from "@/types";

/**
 * Converts date strings back to Date objects after JSON.parse
 */
export function deserializeAppointments(data: any[]): Appointment[] {
  return data.map((item) => ({
    ...item,
    date: new Date(item.date),
    start: new Date(item.start),
    end: new Date(item.end),
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
