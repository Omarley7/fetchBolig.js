import { onMounted, onUnmounted } from "vue";

let lockCount = 0;

export function useScrollLock() {
  onMounted(() => {
    lockCount++;
    if (lockCount === 1) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
  });

  onUnmounted(() => {
    lockCount--;
    if (lockCount === 0) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
  });
}
