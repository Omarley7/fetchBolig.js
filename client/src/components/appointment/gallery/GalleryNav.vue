<script setup lang="ts">
defineProps<{
    direction: "prev" | "next";
    disabled?: boolean;
}>();
</script>

<template>
    <button
        class="mx-2 p-2 rounded-full bg-gray-800/60 hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-default"
        :disabled="disabled" :aria-label="direction === 'prev' ? 'Previous image' : 'Next image'">
        <img :src="direction === 'prev'
            ? 'https://unpkg.com/lucide-static@latest/icons/chevron-left.svg'
            : 'https://unpkg.com/lucide-static@latest/icons/chevron-right.svg'
            " :alt="direction === 'prev' ? 'Previous' : 'Next'" class="size-6 dark:invert" />
    </button>
</template>
