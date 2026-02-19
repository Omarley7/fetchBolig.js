<script setup lang="ts">
import type { Appointment } from "@/types";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import GlassPill from "~/components/Base/GlassPill.vue";
import { formatCurrency } from "~/lib/formatters";
import FinancialsModal from "./FinancialsModal.vue";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const props = defineProps<{
    appointment: Appointment;
}>();

const { t } = useI18n();

const showFinancials = ref(false);

const hasValidOfferId = computed(() => UUID_RE.test(props.appointment.offerId ?? ""));

function openOnFindbolig() {
    if (!hasValidOfferId.value) return;
    window.open(`https://findbolig.nu/profile/my-offers?offerId=${props.appointment.offerId}`, '_blank');
}
</script>

<template>
    <GlassPill interactive @click="showFinancials = true" class="flex flex-row justify-between py-2 px-4">
        <p class="drop-shadow-(--shady)">{{ formatCurrency(props.appointment.financials.monthlyRentIncludingAconto) }}
            / {{ t("financials.shortMonth") }}
        </p>
        <p class="drop-shadow-(--shady)"> {{ t("financials.firstPayment") }}: {{
            formatCurrency(props.appointment.financials.firstPayment) }}</p>
    </GlassPill>

    <GlassPill v-if="hasValidOfferId" interactive @click="openOnFindbolig"
        class="flex flex-row items-center justify-center gap-2 py-2 px-4 mt-2">
        <img src="https://unpkg.com/lucide-static@latest/icons/external-link.svg" alt="Open on findbolig.nu"
            class="size-4 dark:invert opacity-70" />
        <p class="text-sm drop-shadow-(--shady)">{{ t("appointments.openOnFindbolig") }}</p>
    </GlassPill>

    <FinancialsModal v-if="showFinancials" :financials="props.appointment.financials" @close="showFinancials = false" />
</template>
