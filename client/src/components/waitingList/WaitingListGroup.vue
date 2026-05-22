<script setup lang="ts">
import type { WaitingList } from "@/types";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import BaseCollapse from "~/components/Base/BaseCollapse.vue";
import { useWaitingListsStore } from "~/stores/waitingLists";
import WaitingListCard from "./card/WaitingListCard.vue";

const { t } = useI18n();
const store = useWaitingListsStore();

const props = defineProps<{
  groupKey: "passive" | "active";
  label: string;
  lists: WaitingList[];
  isFirst?: boolean;
  class?: string;
}>();

const expanded = ref(props.isFirst ?? false);
const hasBeenExpanded = ref(expanded.value);

watch(expanded, (val) => {
  if (val) hasBeenExpanded.value = true;
});

function toggleExpanded() {
  expanded.value = !expanded.value;
}

async function onReactivateAll(e: MouseEvent) {
  e.stopPropagation();
  await store.reactivateAll();
}
</script>

<template>
  <li :class="props.class">
    <!-- Group header -->
    <div class="flex items-center justify-between cursor-pointer" @click="toggleExpanded">
      <div class="flex items-center gap-2">
        <h2 class="text-[clamp(0.95rem,3vw,1.125rem)] font-semibold pl-1">{{ label }}</h2>
        <span
          v-if="!expanded"
          class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full dark:bg-white/15 bg-neutral-400/30 dark:text-neutral-300 text-neutral-600"
        >
          {{ props.lists.length }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="groupKey === 'passive' && lists.length > 1"
          class="px-2.5 py-1 rounded-md text-xs font-semibold
                 bg-amber-500 hover:bg-amber-600 text-white
                 disabled:opacity-60 transition-colors"
          :disabled="store.isMutating"
          @click="onReactivateAll"
        >
          <template v-if="store.bulkInProgress">
            {{ t("waitingLists.actions.reactivating", { done: store.bulkDone, total: store.bulkTotal }) }}
          </template>
          <template v-else>
            {{ t("waitingLists.actions.reactivateAll") }}
          </template>
        </button>
        <img
          src="/icons/chevron-down.svg"
          alt="Expand/Collapse"
          class="size-5 dark:invert opacity-70 transition-transform duration-200"
          :class="{ '-rotate-90': !expanded }"
        />
      </div>
    </div>

    <!-- Inner loop -->
    <BaseCollapse v-model:expanded="expanded">
      <hr class="dark:border-zinc-50/25 m-1" />
      <ul class="grid grid-cols-1 md:grid-cols-2 gap-1.5 p-1">
        <WaitingListCard
          v-for="list in props.lists"
          :key="list.propertyId"
          :list="list"
          :load-image="hasBeenExpanded"
        />
      </ul>
    </BaseCollapse>
  </li>
</template>
