import type { WaitingList } from "@/types";
import { computed, type Ref } from "vue";

export type GroupedWaitingLists = {
  key: "passive" | "active";
  label: string;
  lists: WaitingList[];
  isFirst: boolean;
}[];

export function useGroupWaitingLists(lists: Ref<WaitingList[]>, t: (key: string) => string) {
  const grouped = computed<GroupedWaitingLists>(() => {
    const passive = lists.value
      .filter((l) => l.status === "Passive")
      .sort((a, b) => a.name.localeCompare(b.name, "da"));

    const active = lists.value
      .filter((l) => l.status === "Active")
      .sort((a, b) => a.name.localeCompare(b.name, "da"));

    const groups: GroupedWaitingLists = [];

    if (passive.length > 0) {
      groups.push({
        key: "passive",
        label: t("waitingLists.groups.passive"),
        lists: passive,
        isFirst: true,
      });
    }

    if (active.length > 0) {
      groups.push({
        key: "active",
        label: t("waitingLists.groups.active"),
        lists: active,
        isFirst: groups.length === 0,
      });
    }

    return groups;
  });

  return { grouped };
}
