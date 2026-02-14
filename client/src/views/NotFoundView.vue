<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 py-16">
    <h1 class="text-6xl font-bold opacity-30">404</h1>
    <p class="text-xl">{{ t("common.pageNotFound") }}</p>
    <router-link to="/" class="text-blue-400 hover:text-blue-300 underline transition-colors">
      {{ t("common.backToHome") }}
    </router-link>
  </div>
</template>
