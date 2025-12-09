import type { Appointment } from "@/types";
import {
  formatDay,
  formatMonth,
  formatWeek,
  getISOWeekStart,
} from "~/lib/dateHelper";

export type Group = "day" | "week" | "month";
export type GroupedAppointments = [string, Appointment[]][];

export function groupAppointments(
  appointments: Appointment[],
  groupBy: Group
): GroupedAppointments {
  if (groupBy === "day") return getAppointmentsByDay(appointments);
  if (groupBy === "week") return getAppointmentsByWeek(appointments);
  return getAppointmentsByMonth(appointments);
}

export function formatLabel(key: string, groupBy: Group): string {
  if (groupBy === "day") return formatDay(key);
  if (groupBy === "week") return formatWeek(key);
  return formatMonth(key);
}

function getAppointmentsByDay(
  appointments: Appointment[]
): GroupedAppointments {
  return groupBy(appointments, (appt) => appt.date.toISOString().slice(0, 10));
}

function getAppointmentsByWeek(
  appointments: Appointment[]
): GroupedAppointments {
  return groupBy(appointments, (appt) => getISOWeekStart(appt.date));
}

function getAppointmentsByMonth(
  appointments: Appointment[]
): GroupedAppointments {
  return groupBy(appointments, (appt) => {
    const year = appt.date.getFullYear();
    const month = String(appt.date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
}

function groupBy(
  appointments: Appointment[],
  getKey: (appt: Appointment) => string
): GroupedAppointments {
  const groups: Record<string, Appointment[]> = {};
  appointments.forEach((appt: Appointment) => {
    const key = getKey(appt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(appt);
  });

  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}
