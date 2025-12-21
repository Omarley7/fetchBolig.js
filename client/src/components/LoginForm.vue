<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";
import { useI18n } from "vue-i18n";

const auth = useAuth();
const { t } = useI18n();

async function handleLogin() {
  await auth.login(auth.email, auth.password);
}
</script>

<template>
  <form v-if="!auth.isAuthenticated" @submit.prevent="handleLogin" class="flex gap-2 items-center">
    <div class="flex flex-col gap-1">
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
    </div>
    <button type="submit" :disabled="auth.isLoading" class="disabled:opacity-50">
      {{ auth.isLoading ? t('auth.loggingIn') : t('common.login') }}
    </button>

    <span v-if="auth.error" class="text-red-500 text-sm">
      {{ auth.error }}
    </span>
  </form>
  <div v-else class="flex items-center justify-between gap-2">
    <button @click="auth.logout" :disabled="auth.isLoading" class="disabled:opacity-50">
      {{ auth.isLoading ? t('auth.loggingOut') : t('common.logout') }}
    </button>
  </div>
</template>
