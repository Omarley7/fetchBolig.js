<script setup lang="ts">
import type { WaitingList } from "@/types";

defineProps<{ list: WaitingList }>();
defineEmits<{ close: []; "after-leave": [] }>();
</script>

<template>
  <!-- Stub — replaced by full implementation in Task 17 -->
  <div hidden />
</template>
