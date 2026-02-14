<script setup lang="ts">
import { computed } from "vue";
import { thumbnail } from "~/lib/imageTransform";

const props = defineProps<{
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "outlined" | "elevated";
  backgroundImage?: string;
  loadImage?: boolean;
  minW?: string;
  minH?: string;
}>();

const cardStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.backgroundImage && props.loadImage !== false) {
    style.backgroundImage = `url(${thumbnail(props.backgroundImage)})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  if (props.minW) style.minWidth = props.minW;
  if (props.minH) style.minHeight = props.minH;
  return Object.keys(style).length ? style : undefined;
});
</script>

<template>
  <div class="rounded-lg w-full bg-no-repeat" :class="[
    // Padding variants
    {
      'p-0': padding === 'none',
      'p-1': padding === 'sm',
      'p-2': padding === 'md' || !padding,
      'p-6': padding === 'lg',
    },
    // Style variants
    {
      '': variant === 'default' || !variant,
      'border border-zinc-700': variant === 'outlined',
      'border-2 shadow-lg shadow-black/20': variant === 'elevated',
    },
  ]" :style="cardStyle">
    <slot />
  </div>
</template>
