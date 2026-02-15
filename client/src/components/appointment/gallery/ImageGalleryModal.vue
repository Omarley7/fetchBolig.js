<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { galleryImage } from "~/lib/imageTransform";
import GalleryNav from "./GalleryNav.vue";
import { useAppointmentsStore } from "~/stores/appointments";

const { getImageUrl } = useAppointmentsStore();

const props = defineProps<{
  images: string[];
  blueprints?: string[];
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
  return galleryImage(getImageUrl(path));
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

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  document.body.style.overflow = "hidden";
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" @click.self="emit('close')">
      <div class="relative flex flex-col items-center max-w-[90vw] max-h-[90vh]">
        <!-- Close button -->
        <button class="absolute right-0 z-10 p-1 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
          @click="emit('close')">
          <img src="https://unpkg.com/lucide-static@latest/icons/x.svg" alt="Close" class="size-6 dark:invert" />
        </button>

        <!-- Tabs -->
        <div v-if="hasBlueprints" class="flex gap-2 mb-3">
          <button class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'images' ? 'dark:bg-neutral-500!' : 'not-dark:bg-neutral-400!'"
            @click="switchTab('images')">
            {{ $t("gallery.photos") }}
          </button>
          <button class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'blueprints' ? 'dark:bg-neutral-500!' : 'not-dark:bg-neutral-400!'"
            @click="switchTab('blueprints')">
            {{ $t("gallery.blueprints") }}
          </button>
        </div>

        <!-- Image -->
        <div class="relative flex items-center">
          <GalleryNav class="hidden sm:block" direction="prev" :disabled="currentIndex === 0" @click="prev" />

          <div v-if="currentUrl" class="relative select-none">
            <img :src="currentUrl" alt="Gallery image"
              class="max-h-[75vh] max-w-[80vw] sm:max-w-[70vw] rounded-lg object-contain" />
            <!-- Click zones: left 40% = prev, right 60% = next -->
            <div class="absolute inset-0 flex">
              <div class="w-[40%] cursor-pointer" @click="prev" />
              <div class="w-[60%] cursor-pointer" @click="next" />
            </div>
          </div>

          <GalleryNav class="hidden sm:block" direction="next" :disabled="currentIndex >= activeList.length - 1"
            @click="next" />
        </div>

        <!-- Counter -->
        <p v-if="activeList.length > 1" class="mt-2 text-sm text-gray-400">
          {{ currentIndex + 1 }} / {{ activeList.length }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
