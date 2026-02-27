<script setup lang="ts">
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    expanded?: boolean;
    duration?: number;
  }>(),
  {
    expanded: true,
    duration: 200,
  }
);

const emit = defineEmits<{
  "update:expanded": [value: boolean];
}>();

const isExpanded = ref(props.expanded);
const contentRef = ref<HTMLElement | null>(null);
const contentHeight = ref<string>(props.expanded ? "auto" : "0px");
const isAnimating = ref(false);

watch(
  () => props.expanded,
  (newVal) => {
    isExpanded.value = newVal;
  }
);

watch(isExpanded, (newVal) => {
  emit("update:expanded", newVal);
  const el = contentRef.value;
  if (!el) return;

  if (newVal) {
    // Expanding: set concrete pixel height, then switch to auto after transition
    contentHeight.value = `${el.scrollHeight}px`;
    setTimeout(() => {
      if (isExpanded.value) {
        contentHeight.value = "auto";
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, props.duration);
  } else {
    // Collapsing: if currently "auto", pin to concrete pixel height first,
    // wait for the browser to paint that value, then collapse to 0
    if (contentHeight.value === "auto") {
      isAnimating.value = true;
      contentHeight.value = `${el.scrollHeight}px`;
      requestAnimationFrame(() => {
        contentHeight.value = "0px";
        isAnimating.value = false;
      });
    } else {
      contentHeight.value = "0px";
    }
  }
});

function toggle() {
  isExpanded.value = !isExpanded.value;
}

defineExpose({ toggle, isExpanded });
</script>

<template>
  <div class="overflow-hidden">
    <div
      ref="contentRef"
      class="transition-all ease-in-out"
      :style="{
        height: isExpanded || isAnimating ? contentHeight : '0px',
        transitionDuration: `${duration}ms`,
      }"
    >
      <slot />
    </div>
  </div>
</template>
