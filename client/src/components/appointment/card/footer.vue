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
    <GlassPill interactive @click="showFinancials = true" class="flex items-center justify-between py-2 px-3 gap-2">
        <p class="text-[clamp(0.8rem,2.5vw,0.925rem)] drop-shadow-(--shady) truncate">
            {{ formatCurrency(props.appointment.financials.monthlyRentIncludingAconto) }}
            / {{ t("financials.shortMonth") }}
        </p>
        <p class="text-[clamp(0.75rem,2vw,0.85rem)] text-white/70 drop-shadow-(--shady) truncate">
            {{ t("financials.firstPayment") }}: {{ formatCurrency(props.appointment.financials.firstPayment) }}
        </p>
        <button v-if="hasValidOfferId"
            class="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
            :aria-label="t('appointments.openOnFindbolig')"
            @click.stop="openOnFindbolig">
            <img src="/icons/external-link.svg" alt=""
                class="size-4 dark:invert opacity-60 hover:opacity-100 transition-opacity" />
        </button>
    </GlassPill>

    <FinancialsModal v-if="showFinancials" :financials="props.appointment.financials" @close="showFinancials = false" />
</template>
