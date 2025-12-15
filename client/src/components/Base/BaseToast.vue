<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { Toast, ToastType } from "~/stores/toast";
import { useToastStore } from "~/stores/toast";

const props = defineProps<{
  toast: Toast;
}>();

const toastStore = useToastStore();
const progress = ref(100);
let animationFrame: number | null = null;

const typeStyles: Record<ToastType, string> = {
  error: "bg-red-900/90 border-red-500",
  warning: "bg-yellow-900/90 border-yellow-500",
  success: "bg-green-900/90 border-green-500",
  info: "bg-blue-900/90 border-blue-500",
};

const progressColors: Record<ToastType, string> = {
  error: "bg-red-500",
  warning: "bg-yellow-500",
  success: "bg-green-500",
  info: "bg-blue-500",
};

const typeClass = computed(() => typeStyles[props.toast.type]);
const progressColor = computed(() => progressColors[props.toast.type]);

function updateProgress() {
  const elapsed = Date.now() - props.toast.createdAt;
  const remaining = Math.max(0, props.toast.duration - elapsed);
  progress.value = (remaining / props.toast.duration) * 100;

  if (progress.value > 0) {
    animationFrame = requestAnimationFrame(updateProgress);
  }
}

function dismiss() {
  toastStore.dismiss(props.toast.id);
}

onMounted(() => {
  if (props.toast.duration > 0) {
    animationFrame = requestAnimationFrame(updateProgress);
  }
});

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});
</script>

<template>
  <div
    class="relative overflow-hidden rounded-lg border shadow-lg min-w-72 max-w-96"
    :class="typeClass"
  >
    <div class="flex items-start gap-3 p-4">
      <p class="flex-1 text-sm text-white">{{ toast.message }}</p>
      <button
        @click="dismiss"
        class="text-white/70 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg
          class="size-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Progress bar -->
    <div
      v-if="toast.duration > 0"
      class="absolute bottom-0 left-0 h-1 transition-all duration-100"
      :class="progressColor"
      :style="{ width: `${progress}%` }"
    />
  </div>
</template>
