<script setup lang="ts">
import type { Appointment } from "@/types";
import GlassPill from "~/components/Base/GlassPill.vue";

const emit = defineEmits<{
  openGallery: [];
}>();

const props = defineProps<{
  appointment: Appointment;
  galleryOpen: boolean;
}>();

</script>

<template>
  <div class="flex flex-col items-center">
    <GlassPill interactive @click="emit('openGallery')">
      <h3 class="text-[clamp(1rem,3.5vw,1.25rem)] px-8 max-sm:px-4 py-2 font-semibold drop-shadow-(--shady)">
        {{ props.appointment.title }}</h3>
    </GlassPill>
  </div>
</template>
