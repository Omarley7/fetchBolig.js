<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuth } from "~/composables/useAuth";
import { formatRelativeTime, formatUpdatedAt, getStalenessLevel } from "~/lib/formatters";
import { useAppointmentsStore } from "~/stores/appointments";
const props = defineProps<{
  class?: string;
}>();
const auth = useAuth();
const store = useAppointmentsStore();
const { t } = useI18n();
const expanded = ref(false);

// Tick every 30s so relative time and staleness update in realtime
const now = ref(Date.now());
const ticker = setInterval(() => { now.value = Date.now(); }, 30_000);
onBeforeUnmount(() => clearInterval(ticker));

const relativeTime = computed(() => { now.value; return formatRelativeTime(store.updatedAt, t); });
const fullTimestamp = computed(() => formatUpdatedAt(store.updatedAt));
const staleness = computed(() => { now.value; return getStalenessLevel(store.updatedAt); });
const dotColor = computed(() => {
  switch (staleness.value) {
    case "fresh": return "bg-emerald-500";
    case "aging": return "bg-amber-500";
    case "stale": return "bg-red-500";
  }
});
const borderColor = computed(() => {
  switch (staleness.value) {
    case "fresh": return "border-emerald-500/40";
    case "aging": return "border-amber-500/40";
    case "stale": return "border-red-500/40";
  }
});
</script>
<template>
  <div :class="props.class">
    <!-- Sync status banner -->
    <div
      class="flex flex-col rounded-lg border transition-all duration-200 dark:bg-white/5 bg-neutral-200 overflow-hidden"
      :class="borderColor">
      <!-- Main row: always visible -->
      <div class="flex items-center justify-between px-3 py-2 gap-3">
        <!-- Left: status dot + relative time (clickable to expand) -->
        <button
          class="flex items-center gap-2.5 text-sm dark:text-neutral-300 text-neutral-700 hover:dark:text-white hover:text-neutral-900 transition-colors cursor-pointer"
          @click="expanded = !expanded" :title="t('sync.clickToExpand')">
          <span class="relative flex size-2.5 shrink-0">
            <span class="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" :class="dotColor"
              v-if="staleness === 'fresh'" />
            <span class="relative inline-flex size-2.5 rounded-full" :class="dotColor" />
          </span>
          <span>{{ t("sync.updatedAgo", [relativeTime]) }}</span>
          <svg class="size-3.5 transition-transform duration-200 opacity-50" :class="{ 'rotate-180': expanded }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <!-- Right: refresh button with label -->
        <div class="flex items-center gap-2 shrink-0">
          <button :disabled="store.isLoading" @click="store.handleRefresh()" class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md
                   dark:bg-white/10 bg-neutral-300 dark:hover:bg-white/20 hover:bg-neutral-400
                   dark:text-neutral-200 text-neutral-700 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <img v-show="store.isLoading" src="/icons/refresh-ccw.svg" alt=""
              class="size-3.5 dark:invert opacity-70 animate-spin" />
            <img v-show="!store.isLoading" src="/icons/cloud-download.svg" alt=""
              class="size-3.5 dark:invert opacity-70" />
            <span>{{ store.isLoading ? t("sync.syncing") : t("sync.fetchData") }}</span>
          </button>
        </div>
      </div>
      <!-- Expanded: exact timestamp -->
      <div v-show="expanded"
        class="px-3 pb-2 text-xs dark:text-neutral-400 text-neutral-500 border-t dark:border-white/10 border-neutral-300 pt-2 flex gap-3">
        <template v-if="fullTimestamp">
          <span>{{ t("sync.date") }}: {{ fullTimestamp.date }}</span>
          <span>{{ t("sync.time") }}: {{ fullTimestamp.time }}</span>
        </template>
        <span v-else>---</span>
      </div>
    </div>
  </div>
</template>