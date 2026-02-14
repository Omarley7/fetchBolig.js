<script setup lang="ts">
const model = defineModel<boolean>({ default: false });

defineProps<{
  labelTrue?: string;
  labelFalse?: string;
  disabled?: boolean;
  class?: string;
}>();
</script>

<template>
  <label class="inline-flex items-center gap-2 cursor-pointer"
    :class="[$props.class, { 'opacity-50 pointer-events-none': disabled }]">

    <span v-if="labelFalse" class="text-sm font-medium transition-colors duration-200"
      :class="model ? 'text-neutral-500 not-dark:italic' : 'dark:text-white font-semibold'">{{ labelFalse }}</span>

    <button type="button" role="switch" :aria-checked="model" :disabled="disabled"
      class="relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 border border-neutral-600!"
      :class="model ? 'bg-blue-600' : 'bg-neutral-500'" @click="model = !model">
      <span
        class="absolute top-0.75 left-0 size-3.5 rounded-full dark:bg-white bg-neutral-700 shadow-sm transition-transform duration-200"
        :class="model ? 'translate-x-4.5' : 'translate-x-0.75'" />
    </button>

    <span v-if="labelTrue" class="text-sm font-medium transition-colors duration-200"
      :class="model ? 'dark:text-white font-semibold' : 'text-neutral-500 not-dark:italic'">{{ labelTrue }}</span>
  </label>
</template>
