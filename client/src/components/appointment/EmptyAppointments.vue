<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const findboligUrl = "https://findbolig.nu";
</script>

<template>
  <div class="empty-state flex flex-col items-center px-6 py-12 mt-4">
    <!-- Calendar illustration -->
    <div class="illustration mb-8">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Calendar body -->
        <rect x="16" y="28" width="88" height="76" rx="10" class="calendar-body" stroke-width="2.5" />
        <!-- Calendar header band -->
        <rect x="16" y="28" width="88" height="22" rx="10" class="calendar-header" />
        <rect x="16" y="40" width="88" height="10" class="calendar-header" />
        <!-- Binding rings -->
        <rect x="38" y="20" width="6" height="16" rx="3" class="calendar-ring" />
        <rect x="76" y="20" width="6" height="16" rx="3" class="calendar-ring" />
        <!-- Empty day grid — faded dots -->
        <circle cx="38" cy="64" r="3" class="calendar-dot" />
        <circle cx="54" cy="64" r="3" class="calendar-dot" />
        <circle cx="70" cy="64" r="3" class="calendar-dot" />
        <circle cx="86" cy="64" r="3" class="calendar-dot" />
        <circle cx="38" cy="80" r="3" class="calendar-dot" />
        <circle cx="54" cy="80" r="3" class="calendar-dot" />
        <circle cx="70" cy="80" r="3" class="calendar-dot" />
        <circle cx="86" cy="80" r="3" class="calendar-dot" />
        <circle cx="38" cy="96" r="3" class="calendar-dot" />
        <circle cx="54" cy="96" r="3" class="calendar-dot" />
        <!-- Subtle "empty" dash across the middle -->
        <line x1="44" y1="80" x2="80" y2="80" class="calendar-dash" stroke-width="2" stroke-linecap="round" />
      </svg>
    </div>

    <!-- Messaging -->
    <h3 class="text-lg font-semibold mb-2 text-neutral-700 dark:text-neutral-200 text-center">
      {{ t("appointments.emptyTitle") }}
    </h3>
    <p class="text-sm text-neutral-500 dark:text-neutral-400 text-center max-w-xs mb-8 leading-relaxed">
      {{ t("appointments.emptyDescription") }}
    </p>

    <!-- CTA -->
    <a :href="findboligUrl" target="_blank" rel="noopener noreferrer" class="cta-button">
      <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      {{ t("appointments.searchOnFindbolig") }}
    </a>
  </div>
</template>

<style scoped>
.empty-state {
  animation: fadeUp 0.4s ease-out both;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Illustration colors — light */
.calendar-body {
  fill: rgb(245 245 245);
  stroke: rgb(212 212 212);
}
.calendar-header {
  fill: rgb(163 163 163 / 0.3);
}
.calendar-ring {
  fill: rgb(163 163 163 / 0.5);
}
.calendar-dot {
  fill: rgb(163 163 163 / 0.25);
}
.calendar-dash {
  stroke: rgb(163 163 163 / 0.3);
}

/* Illustration colors — dark */
:where(.dark, .dark *) .calendar-body {
  fill: rgb(255 255 255 / 0.05);
  stroke: rgb(255 255 255 / 0.12);
}
:where(.dark, .dark *) .calendar-header {
  fill: rgb(255 255 255 / 0.08);
}
:where(.dark, .dark *) .calendar-ring {
  fill: rgb(255 255 255 / 0.15);
}
:where(.dark, .dark *) .calendar-dot {
  fill: rgb(255 255 255 / 0.08);
}
:where(.dark, .dark *) .calendar-dash {
  stroke: rgb(255 255 255 / 0.1);
}

/* CTA button */
.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  text-decoration: none;

  background: rgb(99 102 241);
  color: white;
  box-shadow:
    0 1px 3px rgb(99 102 241 / 0.3),
    0 0 0 1px rgb(99 102 241 / 0.15);
}

.cta-button:hover {
  background: rgb(79 70 229);
  box-shadow:
    0 4px 12px rgb(99 102 241 / 0.35),
    0 0 0 1px rgb(79 70 229 / 0.2);
  transform: translateY(-1px);
  color: white;
}

.cta-button:active {
  transform: translateY(0);
  box-shadow:
    0 1px 2px rgb(99 102 241 / 0.25),
    0 0 0 1px rgb(99 102 241 / 0.15);
}
</style>
