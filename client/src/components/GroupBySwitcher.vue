<script setup lang="ts">
import type { Group } from "../composables/useGrouping";

const props = defineProps<{
  modelValue: Group;
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: Group): void;
}>();

const options: { value: Group; label: string }[] = [
  { value: "day", label: "Dag" },
  { value: "week", label: "Uge" },
  { value: "month", label: "Måned" },
];

function select(value: Group) {
  emit("update:modelValue", value);
}
</script>

<template>
  <div class="switcher" role="group" aria-label="Gruppér aftaler">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="switcher__button"
      :class="{ 'is-active': option.value === props.modelValue }"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
