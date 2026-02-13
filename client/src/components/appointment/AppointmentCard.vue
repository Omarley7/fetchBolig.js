<script setup lang="ts">
import type { Appointment } from "@/types";
import { ref } from "vue";
import { formatTimeSlot } from "~/lib/formatters";
import { thumbnail } from "~/lib/imageTransform";
import BaseCard from "~/components/Base/BaseCard.vue";
import FinancialsDisplay from "./FinancialsDisplay.vue";
import ImageGalleryModal from "./gallery/ImageGalleryModal.vue";
import { useAppointmentsStore } from "~/stores/appointments";
import { useI18n } from "vue-i18n";
import "add-to-calendar-button";

const { imageBaseUrl } = useAppointmentsStore();
const { t } = useI18n();

const props = defineProps<{
  appointment: Appointment;
  includeDate?: boolean;
  loadImage?: boolean;
}>();

const galleryOpen = ref(false);

function openGallery() {
  galleryOpen.value = true;
}

function handleMapClick() {
  const address = `${props.appointment.residence.addressLine1}, ${props.appointment.residence.addressLine2}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  window.open(mapsUrl, "_blank");
}
</script>

<template>
  <li class="mb-2">
    <BaseCard>
      <div class="flex flex-col gap-2">
        <h3 class="text-xl font-semibold">{{ props.appointment.title }}</h3>
        <div class="flex gap-4 items-center">
          <img src="https://unpkg.com/lucide-static@latest/icons/map.svg" alt="Map"
            class="size-7 invert opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
            @click="handleMapClick" />
          <div class="flex flex-col">
            <p class="text-sm">{{ props.appointment.residence.addressLine1 }}</p>
            <p class="text-sm">{{ props.appointment.residence.addressLine2 }}</p>
          </div>
        </div>
      </div>

      <div class="w-full flex flex-row pt-2">
        <img
          class="bg-gray-200 rounded-md mr-4 max-sm:max-w-26 object-cover sm:min-w-42 cursor-pointer hover:opacity-90 transition-opacity"
          alt="Property Thumbnail" loading="lazy"
          :src="props.loadImage !== false ? thumbnail(`${imageBaseUrl}${props.appointment.imageUrl}`) : undefined"
          @click="openGallery" />
        <div class="w-full flex flex-col justify-between">
          <div class="w-full flex flex-wrap justify-between gap-2">
            <p class="text-lg">
              {{ t("appointments.openHouse") }}:
              {{ formatTimeSlot(props.appointment, props.includeDate) }}
            </p>
            <add-to-calendar-button :name="props.appointment.title" options="'Apple','Google'"
              :location="`${props.appointment.residence.addressLine1}, ${props.appointment.residence.addressLine2}`"
              :startDate="props.appointment.date" :endDate="props.appointment.date" :startTime="props.appointment.start"
              :endTime="props.appointment.end" timeZone="Europe/Copenhagen" listStyle="modal"></add-to-calendar-button>
          </div>

          <FinancialsDisplay :financials="appointment.financials" compact />
        </div>
      </div>
    </BaseCard>

    <ImageGalleryModal v-if="galleryOpen"
      :images="props.appointment.images?.length ? props.appointment.images : [props.appointment.imageUrl]"
      :blueprints="props.appointment.blueprints ?? []" :image-base-url="imageBaseUrl" @close="galleryOpen = false" />
  </li>
</template>
