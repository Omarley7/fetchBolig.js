<script setup lang="ts">
import AppHeader from "~/components/AppHeader.vue";
import ToastContainer from "~/components/Base/ToastContainer.vue";
</script>

<template>
  <div class="w-full flex flex-col gap-2">
    <AppHeader />
    <router-view />
  </div>
  <ToastContainer />
</template>
