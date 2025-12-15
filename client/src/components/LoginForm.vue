<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";

const auth = useAuth();

async function handleLogin() {
  await auth.login(auth.email, auth.password);
}
</script>

<template>
  <form @submit.prevent="handleLogin" class="flex gap-2 items-center">
    <input
      v-model="auth.email"
      type="email"
      placeholder="Email"
      :disabled="auth.isLoading"
      class="disabled:opacity-50"
    />
    <input
      v-model="auth.password"
      type="password"
      placeholder="Password"
      :disabled="auth.isLoading"
      class="disabled:opacity-50"
    />
    <button 
      type="submit" 
      :disabled="auth.isLoading"
      class="disabled:opacity-50"
    >
      {{ auth.isLoading ? 'Logger ind...' : 'Login' }}
    </button>
    
    <span v-if="auth.error" class="text-red-500 text-sm">
      {{ auth.error }}
    </span>
  </form>
</template>
