<script setup lang="ts">
import type { Appointment } from "@/types";
import "add-to-calendar-button";
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

</script>
<template>
  <div class="flex flex-col py-4 min-h-56 justify-between">
    <GlassPill interactive @click="handleMapClick" class="flex gap-4 p-2 mb-4 items-center self-end-safe">
      <div class="flex flex-col">
        <p class="text-sm drop-shadow-(--shady)">{{ props.appointment.residence.adressLine1 }}</p>
        <p class="text-sm drop-shadow-(--shady)">{{ props.appointment.residence.adressLine2 }}</p>
      </div>
      <img src="/icons/map.svg" alt="Map"
        class="size-7 invert opacity-70 cursor-pointer hover:opacity-100 transition-opacity" @click="handleMapClick" />
    </GlassPill>

    <GlassPill v-if="props.appointment.date" class="flex p-2 gap-3 items-center self-start">
      <div>
        <p class="text-lg drop-shadow-(--shady)">
          {{ t("appointments.openHouse") }}
        </p>
        <p class="text-sm drop-shadow-(--shady)">
          {{ formatTimeSlot(props.appointment, props.includeDate) }}
        </p>
      </div>
      <add-to-calendar-button :name="props.appointment.title" options="'Apple','Google','Microsoft365','Outlook.com'"
        :lightMode="isDark ? 'dark' : 'light'"
        :location="`${props.appointment.residence.adressLine1}, ${props.appointment.residence.adressLine2}`"
        :startDate="props.appointment.date" :endDate="props.appointment.date" :startTime="props.appointment.start"
        :endTime="props.appointment.end" timeZone="Europe/Copenhagen" listStyle="dropup-static" hideBackground
        :label="`${t('appointments.addToCalendar')}`"
        pastDateHandling="" hideTextLabelList size="6|4|4" buttonStyle="3d" hideBranding></add-to-calendar-button>
    </GlassPill>
  </div>
</template>
