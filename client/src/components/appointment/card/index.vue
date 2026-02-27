<script setup lang="ts">
import type { Appointment } from "@/types";
import { ref } from "vue";
import BaseCard from "~/components/Base/BaseCard.vue";
import { useAppointmentsStore } from "~/stores/appointments";
import CardHeader from "./header.vue";
import CardBody from "./body.vue";
import CardFooter from "./footer.vue";
import ImageGalleryModal from "../gallery/ImageGalleryModal.vue";

const { getImageUrl } = useAppointmentsStore();

const props = defineProps<{
    appointment: Appointment;
    includeDate?: boolean;
    loadImage?: boolean;
}>();

const galleryOpen = ref(false);

function openGallery() {
    galleryOpen.value = true;
}
</script>

<template>
    <li class="mb-2">
        <BaseCard :background-image="getImageUrl(props.appointment.imageUrl)" :load-image="props.loadImage" min-h="280px">
            <CardHeader :appointment="props.appointment" @open-gallery="openGallery" />
            <CardBody :appointment="props.appointment" :include-date="props.includeDate" />
            <CardFooter :appointment="props.appointment" />
        </BaseCard>
        <ImageGalleryModal v-if="galleryOpen"
            :images="props.appointment.images?.length ? props.appointment.images : [props.appointment.imageUrl]"
            :blueprints="props.appointment.blueprints ?? []" @close="galleryOpen = false" />
    </li>
</template>
