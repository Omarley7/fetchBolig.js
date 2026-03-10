<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import OffersList from "~/components/offer/OffersList.vue";
import { useAuth } from "~/composables/useAuth";
import { getOffersCacheAge } from "~/data/offers";
import { useOffersStore } from "~/stores/offers";

const store = useOffersStore();
const auth = useAuth();
const router = useRouter();
const { t } = useI18n();

const offerCount = computed(() => store.offers.length);

onMounted(() => {
  const hasCache = getOffersCacheAge() !== null;
  if (!auth.isAuthenticated && !hasCache) {
    router.replace("/");
    return;
  }
  store.init();
});
</script>

<template>
  <div>
    <p class="mb-3 text-xl font-semibold tracking-tight dark:text-white flex items-baseline gap-2">
      {{ t("offers.pageTitle") }}
      <span v-if="offerCount > 0" class="text-xs font-normal text-neutral-400 dark:text-neutral-500">
        {{ t("offers.count", { count: offerCount }, offerCount) }}
      </span>
    </p>
    <OffersList />
  </div>
</template>
