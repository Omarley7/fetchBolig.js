import type { Appointment } from "@/types";
import {
  formatDay,
  formatMonth,
  formatWeek,
  getISOWeekStart,
} from "~/lib/dateHelper";

type Group = "day" | "week" | "month";
type GroupedAppointments = [string, Appointment[]][];

export default () => ({
  _groupBy: "" as Group,

  groupAppointments(
    appointments: Appointment[],
    groupBy: Group
  ): GroupedAppointments {
    this._groupBy = groupBy;

    if (groupBy === "day") return getAppointmentsByDay(appointments);
    if (groupBy === "week") return getAppointmentsByWeek(appointments);
    return getAppointmentsByMonth(appointments);
  },

  formatLabel(key: string): string {
    if (this._groupBy === "day") return formatDay(key);
    if (this._groupBy === "week") return formatWeek(key);
    return formatMonth(key);
  },
});

function getAppointmentsByDay(
  appointments: Appointment[]
): GroupedAppointments {
  return groupBy(appointments, (appt) => {
    // YYYY-MM-DD
    return appt.date.toISOString().slice(0, 10);
  });
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
    return `${year}-${month}`; // fx "2025-12"
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
