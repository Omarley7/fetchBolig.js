import type { Appointment } from "@/types";
import { computed, type Ref } from "vue";
import {
    formatDay,
    formatMonth,
    formatWeek,
    getISOWeekStart,
} from "~/lib/dateHelper";

export type GroupBy = "day" | "week" | "month";
export type GroupedAppointments = [string, Appointment[]][];

function hasValidDate(appt: Appointment): boolean {
    return appt.date !== null;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): [string, T[]][] {
    const map = new Map<string, T[]>();
    for (const item of items) {
        const key = keyFn(item);
        const group = map.get(key) ?? [];
        group.push(item);
        map.set(key, group);
    }
    return Array.from(map.entries());
}

function getAppointmentsByDay(
    appointments: Appointment[]
): GroupedAppointments {
    const validAppointments = appointments.filter(hasValidDate);
    return groupBy(validAppointments, (appt) => appt.date!);
}

function getAppointmentsByWeek(
    appointments: Appointment[]
): GroupedAppointments {
    const validAppointments = appointments.filter(hasValidDate);
    return groupBy(validAppointments, (appt) =>
        getISOWeekStart(new Date(appt.date!))
    );
}

function getAppointmentsByMonth(
    appointments: Appointment[]
): GroupedAppointments {
    const validAppointments = appointments.filter(hasValidDate);
    return groupBy(validAppointments, (appt) => appt.date!.slice(0, 7));
}

export function useGroupAppointments(
    appointments: Ref<Appointment[]>,
    groupBy: Ref<GroupBy>
) {
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
