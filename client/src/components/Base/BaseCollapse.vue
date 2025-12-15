<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

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

watch(
  () => props.expanded,
  (newVal) => {
    console.log("Prop expanded changed to", newVal);
    isExpanded.value = newVal;
  }
);

watch(isExpanded, async (newVal) => {
  emit("update:expanded", newVal);
  if (!contentRef.value) return;

  if (newVal) {
    console.log("Opening collapse");
    contentHeight.value = `${contentRef.value.scrollHeight}px`;
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
        height: isExpanded ? contentHeight : '0px',
        transitionDuration: `${duration}ms`,
      }"
    >
      <slot />
    </div>
  </div>
</template>
