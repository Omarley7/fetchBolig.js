<script setup lang="ts">
defineProps<{
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "outlined" | "elevated";
}>();
</script>

<template>
  <div
    class="rounded-lg w-full"
    :class="[
      // Padding variants
      {
        'p-0': padding === 'none',
        'p-2': padding === 'sm',
        'p-4': padding === 'md' || !padding,
        'p-6': padding === 'lg',
      },
      // Style variants
      {
        'border-2': variant === 'default' || !variant,
        'border border-zinc-700': variant === 'outlined',
        'border-2 shadow-lg shadow-black/20': variant === 'elevated',
      },
    ]"
  >
    <slot />
  </div>
</template>
