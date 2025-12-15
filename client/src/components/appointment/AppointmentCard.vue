<script setup lang="ts">
import type { Appointment } from "@/types";
import { formatTimeSlot } from "~/lib/formatters";
import BaseCard from "~/components/Base/BaseCard.vue";
import FinancialsDisplay from "./FinancialsDisplay.vue";
import { useToastStore } from "~/stores/toast";

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === "true";
const toast = useToastStore();

const props = defineProps<{
  appointment: Appointment;
  includeDate?: boolean;
}>();

function handleMapClick() {
  toast.error(`Kort ikke tilgængelig for: ${props.appointment.residence.adressLine1}`);
}
</script>

<template>
  <li class="mb-2">
    <BaseCard>
      <div class="flex flex-col gap-2">
        <h3 class="text-xl font-semibold">{{ appointment.title }}</h3>
        <div class="flex gap-4 items-center">
          <img
            src="https://unpkg.com/lucide-static@latest/icons/map.svg"
            alt="Map"
            class="size-7 invert opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
            @click="handleMapClick"
          />
          <div class="flex flex-col">
            <p class="text-sm">{{ appointment.residence.adressLine1 }}</p>
            <p class="text-sm">{{ appointment.residence.adressLine2 }}</p>
          </div>
        </div>
      </div>

      <div class="w-full flex flex-row pt-2">
        <img
          class="size-26 bg-gray-200 rounded-md mr-4 min-w-1/4 object-cover"
          alt="Property Thumbnail"
          :src="useMockData ? appointment.imageUrl : `https://findbolig.nu${appointment.imageUrl}`"
        />
        <div class="w-full flex flex-col justify-between">
          <div class="w-full flex flex-row justify-between">
            <p class="text-lg">
              Åbent hus: {{ formatTimeSlot(appointment, includeDate) }}
            </p>
            <img
              src="https://unpkg.com/lucide-static@latest/icons/calendar.svg"
              alt="calendar"
              class="size-7 invert opacity-70"
            />
          </div>

          <FinancialsDisplay :financials="appointment.financials" compact />
        </div>
      </div>
    </BaseCard>
  </li>
</template>
