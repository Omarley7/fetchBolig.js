import { computed, type Ref } from "vue";
import type { Appointment } from "@/types";
import {
  formatLabel,
  groupAppointments,
  type Group,
  type GroupedAppointments,
} from "~/components/groupBy/groupAppointments";

export function useGrouping(
  appointments: Ref<Appointment[]>,
  groupBy: Ref<Group>
) {
  const groupedAppointments = computed<GroupedAppointments>(() =>
    groupAppointments(appointments.value, groupBy.value)
  );

  const formatGroupLabel = (key: string, currentGroup: Group) =>
    formatLabel(key, currentGroup);

  return { groupedAppointments, formatLabel: formatGroupLabel };
}

export type { Group, GroupedAppointments };
