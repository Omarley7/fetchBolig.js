<script setup lang="ts">
import type { Appointment } from "@/types";
import "add-to-calendar-button";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import GlassPill from "~/components/Base/GlassPill.vue";
import { useDarkMode } from "~/composables/useDarkMode";
import { formatTimeSlot } from "~/lib/formatters";

const { t } = useI18n();
const { isDark } = useDarkMode();

const props = defineProps<{
  appointment: Appointment;
  includeDate?: boolean;
}>();

function handleMapClick() {
  const address = `${props.appointment.residence.adressLine1}, ${props.appointment.residence.adressLine2}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  window.open(mapsUrl, "_blank");
}

const hasDetails = computed(() => props.appointment.date || props.appointment.position != null);
</script>

<template>
  <div class="flex flex-col flex-1 py-3">
    <GlassPill class="mt-auto p-3">
      <!-- Address row -->
      <div class="flex items-center justify-between gap-3 cursor-pointer" @click="handleMapClick">
        <div class="flex flex-col min-w-0">
          <p class="text-sm drop-shadow-(--shady) truncate">{{ props.appointment.residence.adressLine1 }}</p>
          <p class="text-xs text-white/70 drop-shadow-(--shady) truncate">{{ props.appointment.residence.adressLine2 }}</p>
        </div>
        <img src="/icons/map.svg" alt="Map"
          class="size-5 shrink-0 invert opacity-60 hover:opacity-100 transition-opacity" />
      </div>

      <!-- Divider -->
      <div v-if="hasDetails" class="border-t border-white/10 my-2"></div>

      <!-- Details rows -->
      <div v-if="hasDetails" class="flex flex-col gap-2">
        <!-- Row 1: Open house time + Queue position -->
        <div class="flex items-end justify-between gap-3">
          <div v-if="props.appointment.date">
            <p class="text-xs text-white/70 drop-shadow-(--shady)">{{ t("appointments.openHouse") }}</p>
            <p class="text-sm font-medium drop-shadow-(--shady) tabular-nums">
              {{ formatTimeSlot(props.appointment, props.includeDate) }}
            </p>
          </div>
          <div v-else class="text-xs text-white/50 italic drop-shadow-(--shady)">
            {{ t("appointments.noDate") }}
          </div>

          <div v-if="props.appointment.position != null" class="flex items-baseline gap-1.5 shrink-0">
            <p class="text-xs text-white/70 drop-shadow-(--shady)">{{ t("appointments.queuePosition") }}:</p>
            <p class="text-lg font-bold drop-shadow-(--shady) tabular-nums">#{{ props.appointment.position }}</p>
          </div>
        </div>

        <!-- Row 2: Calendar button -->
        <add-to-calendar-button v-if="props.appointment.date"
          :name="props.appointment.title" options="'Apple','Google','Microsoft365','Outlook.com'"
          :lightMode="isDark ? 'dark' : 'light'"
          :location="`${props.appointment.residence.adressLine1}, ${props.appointment.residence.adressLine2}`"
          :startDate="props.appointment.date" :endDate="props.appointment.date" :startTime="props.appointment.start"
          :endTime="props.appointment.end" timeZone="Europe/Copenhagen" listStyle="dropup-static" hideBackground
          :label="`${t('appointments.addToCalendar')}`"
          pastDateHandling="" hideTextLabelList size="4|2|2" buttonStyle="3d" hideBranding></add-to-calendar-button>
      </div>
    </GlassPill>
  </div>
</template>
