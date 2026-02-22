import type { Appointment } from "@/types";
import { computed, type Ref } from "vue";
import { useI18n } from "~/i18n";
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
  return groupBy(appointments, (appt) => (hasValidDate(appt) ? appt.date! : null));
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
    let groups: GroupedAppointments;
    switch (groupBy.value) {
      case "day":
        groups = getAppointmentsByDay(appts);
        break;
      case "week":
        groups = getAppointmentsByWeek(appts);
        break;
      case "month":
        groups = getAppointmentsByMonth(appts);
        break;
    }

    // Sort groups by date, with non-parseable dates last
    return groups.sort(([keyA], [keyB]) => {
      // Check if keys are the special NO_DATE_KEY
      if (keyA === NO_DATE_KEY) return 1;
      if (keyB === NO_DATE_KEY) return -1;

      // Try to parse as dates
      const dateA = new Date(keyA);
      const dateB = new Date(keyB);

      const isValidA = !isNaN(dateA.getTime());
      const isValidB = !isNaN(dateB.getTime());

      // Put invalid dates at the end
      if (!isValidA && isValidB) return 1;
      if (isValidA && !isValidB) return -1;
      if (!isValidA && !isValidB) return 0;

      // Both valid, sort chronologically (newest first)
      return dateB.getTime() - dateA.getTime();
    });
  });

  const { t } = useI18n();

  function formatLabel(key: string): string {
    if (key === NO_DATE_KEY) {
      return t("appointments.noDate");
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
