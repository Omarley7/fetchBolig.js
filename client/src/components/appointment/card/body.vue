<script setup lang="ts">
import type { Appointment } from "@/types";
import { formatTimeSlot } from "~/lib/formatters";
import { useI18n } from "vue-i18n";
import "add-to-calendar-button";
import GlassPill from "~/components/Base/GlassPill.vue";

const { t } = useI18n();

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
    <GlassPill class="flex gap-4 p-2 mb-4 items-center self-end-safe">
      <div class="flex flex-col">
        <p class="text-sm drop-shadow-(--shady)">{{ props.appointment.residence.adressLine1 }}</p>
        <p class="text-sm drop-shadow-(--shady)">{{ props.appointment.residence.adressLine2 }}</p>
      </div>
      <img src="https://unpkg.com/lucide-static@latest/icons/map.svg" alt="Map"
        class="size-7 invert opacity-70 cursor-pointer hover:opacity-100 transition-opacity" @click="handleMapClick" />
    </GlassPill>

    <GlassPill class="flex p-2 gap-2 items-end self-start">
      <add-to-calendar-button :name="props.appointment.title" options="'Apple','Google'"
        :location="`${props.appointment.residence.adressLine1}, ${props.appointment.residence.adressLine2}`"
        :startDate="props.appointment.date" :endDate="props.appointment.date" :startTime="props.appointment.start"
        :endTime="props.appointment.end" timeZone="Europe/Copenhagen" listStyle="dropup-static" hideBackground
        pastDateHandling="" hideTextLabelList hideTextLabelButton lightMode="system" size="6|3|3"
        buttonStyle="round"></add-to-calendar-button>
      <div>
        <p class="text-lg drop-shadow-(--shady)">
          {{ t("appointments.openHouse") }}
        </p>
        <p class="text-sm drop-shadow-(--shady)">
          {{ formatTimeSlot(props.appointment, props.includeDate) }}
        </p>
      </div>
    </GlassPill>
  </div>
</template>
