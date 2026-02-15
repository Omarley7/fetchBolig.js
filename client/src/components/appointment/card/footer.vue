<script setup lang="ts">
import type { Appointment } from "@/types";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import GlassPill from "~/components/Base/GlassPill.vue";
import FinancialsModal from "./FinancialsModal.vue";
import { formatCurrency } from "~/lib/formatters";

const props = defineProps<{
    appointment: Appointment;
}>();

const { t } = useI18n();

const showFinancials = ref(false);
</script>

<template>
    <GlassPill interactive @click="showFinancials = true" class="flex flex-row justify-between py-2 px-4">
        <p class="drop-shadow-(--shady)">{{ formatCurrency(props.appointment.financials.monthlyRentIncludingAconto) }}
            / {{ t("financials.shortMonth") }}
        </p>
        <p class="drop-shadow-(--shady)"> {{ t("financials.firstPayment") }}: {{
            formatCurrency(props.appointment.financials.firstPayment) }}</p>
    </GlassPill>

    <FinancialsModal v-if="showFinancials" :financials="props.appointment.financials" @close="showFinancials = false" />
</template>
