import type { Appointment } from "~/types";

type Group = "day" | "week" | "month";
type GroupedAppointments = [string, Appointment[]][];

export default (initialAppointments: Appointment[]) => ({
  appointments: initialAppointments,

  // pr. dag
  get appointmentsByDay(): GroupedAppointments {
    return this._groupBy((appt) => {
      // YYYY-MM-DD
      return appt.date.toISOString().slice(0, 10);
    });
  },

  // pr. uge (ISO-style, uge starter mandag). Key = mandagens dato (YYYY-MM-DD)
  get appointmentsByWeek(): GroupedAppointments {
    return this._groupBy((appt) => {
      const d = new Date(appt.date);
      const day = d.getDay(); // 0 = søn, 1 = man, ... 6 = lør
      const diff = day === 0 ? -6 : 1 - day; // flyt til mandag
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10); // mandag i ugen
    });
  },

  // pr. måned (kalendermåned)
  get appointmentsByMonth(): GroupedAppointments {
    return this._groupBy((appt) => {
      const year = appt.date.getFullYear();
      const month = String(appt.date.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}`; // fx "2025-12"
    });
  },

  getGroupedAppointments(groupBy: Group): GroupedAppointments {
    if (groupBy === "day") return this.appointmentsByDay;
    if (groupBy === "week") return this.appointmentsByWeek;
    return this.appointmentsByMonth;
  },

  // ---- Formatting helpers ----
  formatDay(key: string): string {
    return new Date(key).toLocaleDateString("da-DK", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
  },

  formatWeek(key: string): string {
    const weekStart = new Date(key);
    const weekEnd = new Date(weekStart.getDate() + 6);
    const weekNumber = getISOWeek(weekStart);

    const startStr = weekStart.toLocaleDateString("da-DK", {
      day: "2-digit",
      month: "2-digit",
    });

    const endStr = weekEnd.toLocaleDateString("da-DK", {
      day: "2-digit",
      month: "2-digit",
    });

    return `Uge ${weekNumber} (${startStr} - ${endStr})`;
  },

  formatMonth(key: string): string {
    const [year, month] = key.split("-");
    return new Date(`${year}-${month}-01`).toLocaleDateString("da-DK", {
      month: "long",
      year: "numeric",
    });
  },

  formatGroupKey(groupBy: Group, key: string): string {
    if (groupBy === "day") return this.formatDay(key);
    if (groupBy === "week") return this.formatWeek(key);
    return this.formatMonth(key);
  },

  // ---- Internal grouping logic ----
  _groupBy(getKey: (appt: Appointment) => string): GroupedAppointments {
    const groups: Record<string, Appointment[]> = {};
    this.appointments.forEach((appt: Appointment) => {
      const key = getKey(appt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(appt);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  },
});

function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
