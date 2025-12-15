<script setup lang="ts">
import type { GroupBy } from "~/composables/useGroupAppointments";

const groupBy = defineModel<GroupBy>({ required: true });

const options: { value: GroupBy; label: string }[] = [
  { value: "day", label: "pr. dag" },
  { value: "week", label: "pr. uge" },
  { value: "month", label: "pr. måned" },
];
</script>

<template>
  <div>
    Group by:
    <div class="w-full flex flex-row items-center">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="m-2 rounded-2xl"
        :class="{
          'bg-white/10 border border-zinc-200! opacity-60 cursor-not-allowed':
            groupBy === option.value,
        }"
        :disabled="groupBy === option.value"
        :aria-pressed="groupBy === option.value"
        @click="groupBy = option.value"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
