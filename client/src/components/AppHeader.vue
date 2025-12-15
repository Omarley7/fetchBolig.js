<script setup lang="ts">
import { useAppointmentsStore } from "~/stores/appointments";
import { formatUpdatedAt } from "~/lib/formatters";

const store = useAppointmentsStore();

async function handleLogin() {
  await store.login(store.email, store.password);
}
</script>

<template>
  <div class="flex flex-row justify-between p-2 align-bottom">
    <h1>Kommende aftaler</h1>
    
    <form @submit.prevent="handleLogin">
      <input 
        v-model="store.email" 
        type="email" 
        placeholder="Email" 
      />
      <input 
        v-model="store.password" 
        type="password" 
        placeholder="Password" 
      />
      <button type="submit">Login</button>
    </form>

    <div class="flex flex-col">
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
