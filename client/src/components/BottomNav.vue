<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useWaitingListsStore } from "~/stores/waitingLists";

const { t } = useI18n();

const navItems = [
  { to: "/", icon: "/icons/home.svg", labelKey: "nav.home", exact: true },
  { to: "/appointments", icon: "/icons/calendar-days.svg", labelKey: "nav.appointments" },
  { to: "/offers", icon: "/icons/cloud-download.svg", labelKey: "nav.offers" },
  { to: "/waiting-lists", icon: "/icons/list.svg", labelKey: "nav.waitingLists" },
];

const waitingListsStore = useWaitingListsStore();
const { recentlyPassivated } = storeToRefs(waitingListsStore);
</script>

<template>
  <nav
    class="fixed bottom-0 inset-x-0 z-30
           bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md
           border-t border-zinc-200 dark:border-zinc-700/50
           safe-area-bottom"
  >
    <div class="max-w-5xl mx-auto flex items-stretch justify-around">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ navigate, isActive, isExactActive }"
      >
        <button
          @click="navigate"
          class="flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 transition-colors duration-150"
          :class="(item.exact ? isExactActive : isActive)
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'"
        >
          <div class="relative">
            <img
              :src="item.icon"
              :alt="t(item.labelKey)"
              class="size-5 transition-opacity"
              :class="(item.exact ? isExactActive : isActive)
                ? 'opacity-100 dark:invert-0'
                : 'opacity-50 dark:invert'"
              :style="(item.exact ? isExactActive : isActive)
                ? { filter: 'invert(37%) sepia(74%) saturate(1500%) hue-rotate(200deg) brightness(97%) contrast(97%)' }
                : undefined"
            />
            <span
              v-if="item.to === '/waiting-lists' && recentlyPassivated.length > 0"
              class="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 text-[0.625rem] font-bold rounded-full bg-red-500 text-white"
            >
              {{ recentlyPassivated.length }}
            </span>
          </div>
          <span class="text-[0.625rem] font-medium leading-tight">
            {{ t(item.labelKey) }}
          </span>
        </button>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
