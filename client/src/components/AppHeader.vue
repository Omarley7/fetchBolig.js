<script setup lang="ts">
import { useAppointmentsStore } from "~/stores/appointments";
import { formatUpdatedAt } from "~/lib/formatters";
import LoginForm from "./LoginForm.vue";
import { useAuth } from "~/composables/useAuth";

const store = useAppointmentsStore();
const auth = useAuth();
</script>

<template>
  <div class="flex flex-row gap-2 flex-wrap justify-center p-2 align-bottom">
    <h1>Kommende aftaler</h1>

    <LoginForm />
    <div v-if="auth.isAuthenticated" class="flex flex-col">
      <button
        class="flex justify-center items-center gap-2"
        type="button"
        :disabled="store.isLoading"
        aria-label="Opdater aftaler"
        @click="store.refresh()"
      >
        <img
          v-show="store.isLoading"
          src="https://unpkg.com/lucide-static@latest/icons/refresh-ccw.svg"
          alt="Opdater"
          class="size-4 invert opacity-70 animate-spin"
        />
        <span class="font-light text-sm text-gray-400 italic whitespace-pre-line">
          {{ formatUpdatedAt(store.updatedAt) }}
        </span>
      </button>
    </div>
  </div>
</template>
