<script setup lang="ts">
import type { Appointment } from "@/types";
import { formatTimeSlot } from "../utils/formatters";

defineProps<{
  appointment: Appointment;
  includeDate: boolean;
}>();
</script>

<template>
  <article class="card">
    <div class="card__heading">
      <div class="card__icon" aria-hidden="true">📍</div>
      <h3 class="card__title">{{ appointment.title }}</h3>
    </div>

    <div class="card__body">
      <img
        class="card__image"
        :src="appointment.imageUrl"
        alt="Billede af boligen"
        loading="lazy"
      />

      <div class="card__details">
        <div class="card__row">
          <p class="card__time">
            {{ formatTimeSlot(appointment, includeDate) }}
          </p>
          <span class="card__calendar" aria-hidden="true">📅</span>
        </div>

        <div class="card__rent">
          <p>
            Leje:
            <span>{{
              appointment.financials.monthlyRentIncludingAconto.toLocaleString("da-DK", {
                style: "currency",
                currency: "DKK",
                minimumFractionDigits: 0,
              })
            }}</span>
            pr. måned
          </p>
          <p>
            Indflytningspris:
            <span>{{
              appointment.financials.firstPayment.toLocaleString("da-DK", {
                style: "currency",
                currency: "DKK",
                minimumFractionDigits: 0,
              })
            }}</span>
          </p>
        </div>
      </div>
    </div>
  </article>
</template>
