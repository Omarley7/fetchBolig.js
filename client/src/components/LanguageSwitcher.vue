<script setup lang="ts">
import { useLocale } from "~/composables/useLocale";

const { locale, toggle } = useLocale();
</script>

<template>
  <button
    @click="toggle"
    class="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
    :aria-label="locale === 'da' ? 'Switch to English' : 'Skift til dansk'"
  >
    <Transition name="flag" mode="out-in">
      <img
        v-if="locale === 'da'"
        key="da"
        src="/flags/dk.png"
        alt="Dansk"
        class="size-5 object-contain rounded-sm"
      />
      <img
        v-else
        key="en"
        src="/flags/gb.png"
        alt="English"
        class="size-5 object-contain rounded-sm"
      />
    </Transition>
  </button>
</template>

<style scoped>
.flag-enter-active,
.flag-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.flag-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.flag-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
