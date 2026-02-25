<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { GroupBy } from "~/composables/useGroupAppointments";
const props = defineProps<{
  class?: string;
}>();
const { t } = useI18n();
const groupBy = defineModel<GroupBy>({ required: true });
const options = computed(() => [
  { value: "day" as GroupBy, label: t("common.day") },
  { value: "week" as GroupBy, label: t("common.week") },
  { value: "month" as GroupBy, label: t("common.month") },
]);
</script>
<template>
  <div :class="props.class">
    <div class="inline-flex gap-1 rounded-lg bg-neutral-200/70 dark:bg-white/10 p-1">
      <button v-for="option in options" :key="option.value"
        class="px-4 py-1.5 text-sm rounded-md transition-colors cursor-pointer" :class="{
          'bg-white text-neutral-900 font-semibold shadow-sm dark:bg-white/20 dark:text-white': groupBy === option.value,
          'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 hover:dark:text-neutral-300': groupBy !== option.value,
        }" :disabled="groupBy === option.value" :aria-pressed="groupBy === option.value"
        @click="groupBy = option.value">
        {{ option.label }}
      </button>
    </div>
  </div>
</template>