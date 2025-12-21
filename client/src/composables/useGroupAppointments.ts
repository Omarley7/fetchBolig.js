import type { Appointment } from "@/types";
import { computed, type Ref } from "vue";
import { formatDay, formatMonth, formatWeek, getISOWeekStart } from "~/lib/dateHelper";

export type GroupBy = "day" | "week" | "month";
export type GroupedAppointments = [string, Appointment[]][];

const NO_DATE_KEY = "__no_date__";

function hasValidDate(appt: Appointment): boolean {
  return appt.date !== null && appt.date.trim() !== "";
}

function groupBy<T>(items: T[], keyFn: (item: T) => string | null): [string, T[]][] {
  const map = new Map<string, T[]>();
  const noKeyItems: T[] = [];

  for (const item of items) {
    const key = keyFn(item);
    if (key === null) {
      noKeyItems.push(item);
    } else {
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
    }
  }

  const entries = Array.from(map.entries());
  if (noKeyItems.length > 0) {
    entries.push([NO_DATE_KEY, noKeyItems]);
  }
  return entries;
}

function getAppointmentsByDay(appointments: Appointment[]): GroupedAppointments {
  return groupBy(appointments, (appt) => appt.date);
}

function getAppointmentsByWeek(appointments: Appointment[]): GroupedAppointments {
  return groupBy(appointments, (appt) =>
    hasValidDate(appt) ? getISOWeekStart(new Date(appt.date!)) : null
  );
}

function getAppointmentsByMonth(appointments: Appointment[]): GroupedAppointments {
  return groupBy(appointments, (appt) => (hasValidDate(appt) ? appt.date!.slice(0, 7) : null));
}

export function useGroupAppointments(appointments: Ref<Appointment[]>, groupBy: Ref<GroupBy>) {
  const groupedAppointments = computed<GroupedAppointments>(() => {
    const appts = appointments.value;
    switch (groupBy.value) {
      case "day":
        return getAppointmentsByDay(appts);
      case "week":
        return getAppointmentsByWeek(appts);
      case "month":
        return getAppointmentsByMonth(appts);
    }
  });

  function formatLabel(key: string): string {
    if (key === NO_DATE_KEY) {
      return "No date";
    }
    switch (groupBy.value) {
      case "day":
        return formatDay(key);
      case "week":
        return formatWeek(key);
      case "month":
        return formatMonth(key);
    }
  }

  return {
    groupedAppointments,
    formatLabel,
  };
}
