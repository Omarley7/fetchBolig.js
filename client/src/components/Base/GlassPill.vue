<script setup lang="ts">
defineProps<{
    interactive?: boolean;
    class?: string;
}>();
</script>

<template>
    <div class="rounded-2xl backdrop-blur-xs border border-neutral-400/20
      bg-neutral-300/20 text-neutral-600
      dark:bg-neutral-800/20 dark:text-neutral-100/95
      transition-colors duration-200" :class="[
        $props.class,
        {
            'hover:bg-neutral-300/30 dark:hover:bg-neutral-400/30 hover:cursor-pointer active:bg-neutral-300/40 active:dark:bg-neutral-400/40': interactive,
        },
    ]">
        <slot />
    </div>
</template>
