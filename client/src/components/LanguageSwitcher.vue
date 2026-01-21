<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { locale } = useI18n();

function toggleLanguage() {
    locale.value = locale.value === "da" ? "en" : "da";
}
</script>

<template>
    <div @click="toggleLanguage" class="cursor-pointer p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"
        :aria-label="locale === 'da' ? 'Switch to English' : 'Skift til dansk'">
        <img v-if="locale === 'da'" src="https://flagcdn.com/w40/dk.png" alt="Danish flag"
            class="w-6 h-6 object-contain rounded-xl" />
        <img v-else src="https://flagcdn.com/w40/gb.png" alt="British flag" class="w-6 h-6 object-contain rounded-xl" />
    </div>
</template>
