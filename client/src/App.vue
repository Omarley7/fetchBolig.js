<script setup lang="ts">
import AppHeader from "~/components/AppHeader.vue";
import ToastContainer from "~/components/Base/ToastContainer.vue";
</script>

<template>
  <div class="w-full flex flex-col gap-2 p-4 pt-2 max-sm:min-w-72 sm:min-w-xl">
    <AppHeader />
    <router-view />
  </div>
  <ToastContainer />
</template>
