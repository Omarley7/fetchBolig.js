<script setup lang="ts">
import type { Appointment } from "@/types";
import { useI18n } from "vue-i18n";
import GlassPill from "~/components/Base/GlassPill.vue";
import { formatCurrency } from "~/lib/formatters";

const props = defineProps<{
    appointment: Appointment;
}>();

const { t } = useI18n();

</script>

<template>
    <GlassPill class="flex flex-row justify-between py-2 px-4">
        <p class="drop-shadow-(--shady)">{{ formatCurrency(appointment.financials.monthlyRentIncludingAconto) }} / {{
            t("financials.shortMonth") }}
        </p>
        <p class="drop-shadow-(--shady)"> {{ t("financials.firstPayment") }}: {{
            formatCurrency(appointment.financials.firstPayment) }}</p>
    </GlassPill>
</template>
