<script setup lang="ts">
import type { Appointment } from "@/types";
import "add-to-calendar-button";
import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useDarkMode } from "~/composables/useDarkMode";
import { formatCurrency, formatTimeSlot } from "~/lib/formatters";
import { galleryImage } from "~/lib/imageTransform";
import { useAppointmentsStore } from "~/stores/appointments";
import ImageGalleryModal from "../gallery/ImageGalleryModal.vue";
import FinancialsModal from "../card/FinancialsModal.vue";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const { t } = useI18n();
const { isDark } = useDarkMode();
const { getImageUrl } = useAppointmentsStore();

const props = defineProps<{
  appointment: Appointment;
  includeDate?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const visible = ref(false);
const showGallery = ref(false);
const showFinancials = ref(false);

// Drag-to-dismiss
const dragY = ref(0);
const isDragging = ref(false);
let dragStartY = 0;

const DISMISS_THRESHOLD = 120;

const sheetStyle = computed(() => {
  if (isDragging.value && dragY.value > 0) {
    return { transform: `translateY(${dragY.value}px)`, transition: "none" };
  }
  return undefined;
});

const backdropOpacity = computed(() => {
  if (isDragging.value && dragY.value > 0) {
    return Math.max(0, 1 - dragY.value / 400);
  }
  return undefined;
});

function onDragStart(e: PointerEvent) {
  isDragging.value = true;
  dragStartY = e.clientY;
  dragY.value = 0;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onDragMove(e: PointerEvent) {
  if (!isDragging.value) return;
  const delta = e.clientY - dragStartY;
  dragY.value = Math.max(0, delta);
}

function onDragEnd() {
  if (!isDragging.value) return;
  isDragging.value = false;
  if (dragY.value > DISMISS_THRESHOLD) {
    close();
  } else {
    dragY.value = 0;
  }
}

const hasValidOfferId = computed(() => UUID_RE.test(props.appointment.offerId ?? ""));

const allImages = computed(() => {
  if (props.appointment.images?.length) return props.appointment.images;
  return [props.appointment.imageUrl];
});

function openGallery() {
  showGallery.value = true;
}

function handleMapClick() {
  const address = `${props.appointment.residence.adressLine1}, ${props.appointment.residence.adressLine2}`;
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    "_blank",
  );
}

function openOnFindbolig() {
  if (!hasValidOfferId.value) return;
  window.open(
    `https://findbolig.nu/profile/my-offers?offerId=${props.appointment.offerId}`,
    "_blank",
  );
}

let closedViaPopState = false;

function close() {
  visible.value = false;
  if (!closedViaPopState) {
    // Remove the history entry we pushed on open
    window.removeEventListener("popstate", onPopState);
    history.back();
  }
  setTimeout(() => emit("close"), 320);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && !showGallery.value && !showFinancials.value) close();
}

function onPopState() {
  // Back button pressed — close without calling history.back() again
  closedViaPopState = true;
  close();
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("popstate", onPopState);
  history.pushState({ sheet: true }, "");
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    visible.value = true;
  });
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("popstate", onPopState);
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-end justify-center">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        :class="visible ? 'opacity-100' : 'opacity-0'"
        :style="backdropOpacity != null ? { opacity: backdropOpacity } : undefined"
        @click="close"
      />

      <!-- Sheet -->
      <div
        class="sheet-panel relative w-full max-w-2xl max-h-[92vh]
               bg-white dark:bg-neutral-900
               rounded-t-2xl overflow-hidden
               flex flex-col shadow-2xl
               transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        :class="visible ? 'translate-y-0' : 'translate-y-full'"
        :style="sheetStyle"
      >
        <!-- Drag handle -->
        <div
          class="flex justify-center pt-3 pb-3 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
          @pointerdown="onDragStart"
          @pointermove="onDragMove"
          @pointerup="onDragEnd"
          @pointercancel="onDragEnd"
        >
          <div class="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>

        <!-- Close button -->
        <button
          class="absolute top-3 right-3 z-10 p-1.5 rounded-full
                 bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20
                 transition-colors"
          aria-label="Close"
          @click="close"
        >
          <img src="/icons/x.svg" alt="" class="size-4 invert" />
        </button>

        <!-- Scrollable content -->
        <div class="overflow-y-auto overscroll-contain flex-1">
          <!-- Image gallery -->
          <div v-if="allImages.length > 0" class="relative cursor-pointer" @click="openGallery">
            <Swiper
              :modules="[Navigation, Pagination]"
              :slides-per-view="1"
              :space-between="0"
              :pagination="{ clickable: true }"
              :navigation="allImages.length > 1"
              class="detail-swiper"
            >
              <SwiperSlide v-for="(img, i) in allImages" :key="img">
                <img
                  :src="galleryImage(getImageUrl(img))"
                  :alt="`Photo ${i + 1}`"
                  class="w-full aspect-[16/10] object-cover"
                  :loading="i > 0 ? 'lazy' : 'eager'"
                />
              </SwiperSlide>
            </Swiper>

            <!-- Photo count -->
            <div
              v-if="allImages.length > 1"
              class="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-full
                     bg-black/40 backdrop-blur-sm text-white text-xs tabular-nums pointer-events-none"
            >
              {{ allImages.length }} {{ t("gallery.photos").toLowerCase() }}
            </div>
          </div>

          <!-- Content -->
          <div class="p-5 space-y-5">
            <!-- Title + Address -->
            <div>
              <h2 class="text-lg font-bold text-neutral-900 dark:text-white leading-snug">
                {{ appointment.title }}
              </h2>
              <button class="flex items-center gap-1.5 mt-1.5 group" @click="handleMapClick">
                <p
                  class="text-sm text-neutral-500 dark:text-neutral-400
                         group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors"
                >
                  {{ appointment.residence.adressLine1 }}, {{ appointment.residence.adressLine2 }}
                </p>
                <img
                  src="/icons/map.svg"
                  alt=""
                  class="size-4 opacity-40 group-hover:opacity-70 transition-opacity dark:invert"
                />
              </button>
            </div>

            <hr class="border-neutral-200 dark:border-neutral-700/50" />

            <!-- Date + Time + Queue -->
            <div class="flex items-start justify-between gap-4">
              <div>
                <p
                  class="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1"
                >
                  {{ t("appointments.openHouse") }}
                </p>
                <p
                  v-if="appointment.date"
                  class="text-sm font-medium text-neutral-800 dark:text-neutral-200 tabular-nums"
                >
                  {{ formatTimeSlot(appointment, true) }}
                </p>
                <p v-else class="text-sm italic text-neutral-400 dark:text-neutral-500">
                  {{ t("appointments.noDate") }}
                </p>

                <!-- Calendar button -->
                <div v-if="appointment.date" class="mt-3">
                  <add-to-calendar-button
                    :name="appointment.title"
                    options="'Apple','Google','Microsoft365','Outlook.com'"
                    :lightMode="isDark ? 'dark' : 'light'"
                    :location="`${appointment.residence.adressLine1}, ${appointment.residence.adressLine2}`"
                    :startDate="appointment.date"
                    :endDate="appointment.date"
                    :startTime="appointment.start"
                    :endTime="appointment.end"
                    timeZone="Europe/Copenhagen"
                    listStyle="dropup-static"
                    hideBackground
                    :label="t('appointments.addToCalendar')"
                    pastDateHandling=""
                    hideTextLabelList
                    size="4|3|3"
                    buttonStyle="3d"
                    hideBranding
                  />
                </div>
              </div>

              <!-- Queue position -->
              <div v-if="appointment.position != null" class="text-right shrink-0">
                <p
                  class="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1"
                >
                  {{ t("appointments.queuePosition") }}
                </p>
                <p class="text-2xl font-bold tabular-nums text-neutral-800 dark:text-neutral-200">
                  #{{ appointment.position }}
                </p>
              </div>
            </div>

            <hr class="border-neutral-200 dark:border-neutral-700/50" />

            <!-- Financials summary -->
            <button
              class="w-full flex items-center justify-between p-3 rounded-xl
                     bg-neutral-100 dark:bg-white/5
                     hover:bg-neutral-200/70 dark:hover:bg-white/8
                     transition-colors text-left"
              @click="showFinancials = true"
            >
              <div>
                <p
                  class="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-0.5"
                >
                  {{ t("financials.rent") }}
                </p>
                <p class="text-base font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
                  {{ formatCurrency(appointment.financials.monthlyRentIncludingAconto) }} /
                  {{ t("financials.shortMonth") }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">
                  {{ t("financials.firstPayment") }}
                </p>
                <p class="text-sm font-medium tabular-nums text-neutral-700 dark:text-neutral-200">
                  {{ formatCurrency(appointment.financials.firstPayment) }}
                </p>
              </div>
              <img
                src="/icons/chevron-down.svg"
                alt=""
                class="size-4 -rotate-90 opacity-30 dark:invert shrink-0 ml-2"
              />
            </button>

            <!-- Open on findbolig -->
            <button
              v-if="hasValidOfferId"
              class="w-full flex items-center justify-center gap-2 p-3 rounded-xl
                     border border-neutral-200 dark:border-neutral-700/50
                     hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
              @click="openOnFindbolig"
            >
              <img src="/icons/external-link.svg" alt="" class="size-4 opacity-50 dark:invert" />
              <span class="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {{ t("appointments.openOnFindbolig") }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Gallery modal (on top of detail sheet) -->
    <ImageGalleryModal
      v-if="showGallery"
      :images="allImages"
      :blueprints="appointment.blueprints ?? []"
      @close="showGallery = false"
    />

    <!-- Financials modal -->
    <FinancialsModal
      v-if="showFinancials"
      :financials="appointment.financials"
      @close="showFinancials = false"
    />
  </Teleport>
</template>

<style scoped>
.detail-swiper :deep(.swiper-pagination-bullet) {
  background: white;
  opacity: 0.5;
}

.detail-swiper :deep(.swiper-pagination-bullet-active) {
  opacity: 1;
}

.detail-swiper :deep(.swiper-button-next),
.detail-swiper :deep(.swiper-button-prev) {
  color: rgba(255, 255, 255, 0.7);
  --swiper-navigation-size: 18px;
}

.detail-swiper :deep(.swiper-button-next:hover),
.detail-swiper :deep(.swiper-button-prev:hover) {
  color: white;
}

@media (max-width: 639px) {
  .detail-swiper :deep(.swiper-button-next),
  .detail-swiper :deep(.swiper-button-prev) {
    display: none;
  }
}
</style>
