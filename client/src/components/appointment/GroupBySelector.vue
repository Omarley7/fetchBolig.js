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
  { value: "day" as GroupBy, label: t("common.perDay") },
  { value: "week" as GroupBy, label: t("common.perWeek") },
  { value: "month" as GroupBy, label: t("common.perMonth") },
]);
</script>

<template>
  <div :class="props.class">
    <div v-for="old_option in options" :key="old_option.value" class="rounded-4xl px-4 py-1.5 " :class="{
      'cursor-not-allowed dark:bg-white dark:text-neutral-600 font-semibold bg-neutral-800 text-white not-dark:border-2 border-white/60 ':
        groupBy === old_option.value,
      'cursor-pointer bg-blue-900/20 border border-neutral-600 dark:text-neutral-200 hover:bg-white/20 active:bg-white/30': groupBy !== old_option.value,
    }" :disabled="groupBy === old_option.value" :aria-pressed="groupBy === old_option.value"
      @click="groupBy = old_option.value">
      {{ old_option.label }}
    </div>
  </div>
</template>
