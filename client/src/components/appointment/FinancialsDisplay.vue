<script setup lang="ts">
import type { Financials } from "@/types";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatCurrency } from "~/lib/formatters";

const props = withDefaults(
  defineProps<{
    financials: Financials;
    showMonthlyRentIncludingAconto?: boolean;
    showMonthlyRentExcludingAconto?: boolean;
    showUtilityCosts?: boolean;
    showDeposit?: boolean;
    showPrepaidRent?: boolean;
    showFirstPayment?: boolean;
    compact?: boolean;
  }>(),
  {
    showMonthlyRentIncludingAconto: true,
    showMonthlyRentExcludingAconto: false,
    showUtilityCosts: false,
    showDeposit: false,
    showPrepaidRent: false,
    showFirstPayment: true,
    compact: false,
  }
);

const { t } = useI18n();

const displayItems = computed(() => {
  const items: { label: string; value: number; suffix?: string }[] = [];

  if (props.showMonthlyRentIncludingAconto) {
    items.push({
      label: props.compact ? t("financials.rent") : t("financials.monthlyRentIncludingAconto"),
      value: props.financials.monthlyRentIncludingAconto,
      suffix: t("financials.perMonth"),
    });
  }

  if (props.showMonthlyRentExcludingAconto) {
    items.push({
      label: t("financials.monthlyRentExcludingAconto"),
      value: props.financials.monthlyRentExcludingAconto,
      suffix: t("financials.perMonth"),
    });
  }

  if (props.showUtilityCosts) {
    items.push({
      label: t("financials.utilityCosts"),
      value: props.financials.utilityCosts,
      suffix: t("financials.perMonth"),
    });
  }

  if (props.showDeposit) {
    items.push({
      label: t("financials.deposit"),
      value: props.financials.deposit,
    });
  }

  if (props.showPrepaidRent) {
    items.push({
      label: t("financials.prepaidRent"),
      value: props.financials.prepaidRent,
    });
  }

  if (props.showFirstPayment) {
    items.push({
      label: props.compact ? t("financials.moveInCost") : t("financials.firstPayment"),
      value: props.financials.firstPayment,
    });
  }

  return items;
});
</script>

<template>
  <div class="border border-neutral-200 dark:border-neutral-700 p-2">
    <p v-for="item in displayItems" :key="item.label">
      {{ item.label }}:
      <span class="font-medium">{{ formatCurrency(item.value) }}</span>
      <span v-if="item.suffix" class="text-gray-500 dark:text-gray-400"> {{ item.suffix }}</span>
    </p>
  </div>
</template>
