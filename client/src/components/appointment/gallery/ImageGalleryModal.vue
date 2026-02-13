<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { galleryImage } from "~/lib/imageTransform";
import GalleryNav from "./GalleryNav.vue";

const props = defineProps<{
    images: string[];
    blueprints?: string[];
    imageBaseUrl: string;
}>();

const emit = defineEmits<{
    close: [];
}>();

type Tab = "images" | "blueprints";
const activeTab = ref<Tab>("images");

const currentIndex = ref(0);

const activeList = computed(() =>
    activeTab.value === "images" ? props.images : (props.blueprints ?? [])
);

const currentUrl = computed(() => {
    const path = activeList.value[currentIndex.value];
    if (!path) return undefined;
    return galleryImage(`${props.imageBaseUrl}${path}`);
});

const hasBlueprints = computed(
    () => props.blueprints && props.blueprints.length > 0
);

function switchTab(tab: Tab) {
    activeTab.value = tab;
    currentIndex.value = 0;
}

function prev() {
    if (currentIndex.value > 0) currentIndex.value--;
}

function next() {
    if (currentIndex.value < activeList.value.length - 1) currentIndex.value++;
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") emit("close");
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
}

// Reset index when images change
watch(
    () => props.images,
    () => {
        currentIndex.value = 0;
        activeTab.value = "images";
    }
);

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
    <Teleport to="body">
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" @click.self="emit('close')">
            <div class="relative flex flex-col items-center max-w-[90vw] max-h-[90vh]">
                <!-- Close button -->
                <button
                    class="absolute -top-2 -right-2 z-10 p-1 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                    @click="emit('close')">
                    <img src="https://unpkg.com/lucide-static@latest/icons/x.svg" alt="Close" class="size-6 invert" />
                </button>

                <!-- Tabs -->
                <div v-if="hasBlueprints" class="flex gap-2 mb-3">
                    <button class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                        :class="activeTab === 'images' ? 'bg-white text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
                        @click="switchTab('images')">
                        {{ $t("gallery.photos") }}
                    </button>
                    <button class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                        :class="activeTab === 'blueprints' ? 'bg-white text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
                        @click="switchTab('blueprints')">
                        {{ $t("gallery.blueprints") }}
                    </button>
                </div>

                <!-- Image -->
                <div class="relative flex items-center">
                    <GalleryNav direction="prev" :disabled="currentIndex === 0" @click="prev" />

                    <img v-if="currentUrl" :src="currentUrl" alt="Gallery image"
                        class="max-h-[75vh] max-w-[80vw] rounded-lg object-contain" />

                    <GalleryNav direction="next" :disabled="currentIndex >= activeList.length - 1" @click="next" />
                </div>

                <!-- Counter -->
                <p v-if="activeList.length > 1" class="mt-2 text-sm text-gray-400">
                    {{ currentIndex + 1 }} / {{ activeList.length }}
                </p>
            </div>
        </div>
    </Teleport>
</template>
