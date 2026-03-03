<script setup lang="ts">
import { useRegisterSW } from "virtual:pwa-register/vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW();

function dismiss() {
  offlineReady.value = false;
  needRefresh.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div
        v-if="offlineReady || needRefresh"
        role="alert"
        class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800/50 text-sm"
      >
        <span class="flex-1 text-gray-800 dark:text-gray-200">
          {{ needRefresh ? t("pwa.newContent") : t("pwa.offlineReady") }}
        </span>
        <button
          v-if="needRefresh"
          @click="updateServiceWorker()"
          class="px-3 py-1 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          {{ t("pwa.reload") }}
        </button>
        <button
          @click="dismiss"
          class="px-3 py-1 rounded-md border border-violet-200 dark:border-violet-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
        >
          {{ t("pwa.dismiss") }}
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-up-enter-active {
  transition: all 0.3s ease-out;
}
.slide-up-leave-active {
  transition: all 0.2s ease-in;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(100%);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
