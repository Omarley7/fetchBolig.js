<script setup lang="ts">
import type { Appointment } from "@/types";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import GlassPill from "~/components/Base/GlassPill.vue";

const { t } = useI18n();

const emit = defineEmits<{
  openGallery: [];
}>();

const props = defineProps<{
  appointment: Appointment;
}>();

const photoCount = computed(() => {
  const images = props.appointment.images?.length ?? 0;
  return images > 0 ? images : (props.appointment.imageUrl ? 1 : 0);
});
</script>

<template>
  <div class="flex items-start justify-between gap-2">
    <h3 class="text-base font-bold drop-shadow-(--shady) truncate min-w-0 px-1 pt-1">
      {{ props.appointment.title }}
    </h3>

    <GlassPill
      v-if="photoCount > 0"
      interactive
      class="flex items-center gap-1.5 px-2.5 py-1 shrink-0"
      :aria-label="t('gallery.viewGallery')"
      @click="emit('openGallery')"
    >
      <img
        src="/icons/image.svg"
        :alt="t('gallery.viewGallery')"
        class="size-4 invert opacity-70"
      />
      <span class="text-xs font-medium drop-shadow-(--shady) tabular-nums">
        {{ photoCount }}
      </span>
    </GlassPill>
  </div>
</template>
