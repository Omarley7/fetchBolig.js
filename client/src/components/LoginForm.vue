<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useI18n } from "vue-i18n";

const auth = useAuth();
const { t } = useI18n();
const isModalOpen = ref(false);

async function handleLogin() {
  await auth.login(auth.email, auth.password);
  if (!auth.error) {
    isModalOpen.value = false;
  }
}

function openModal() {
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
}
</script>

<template>
  <div>
    <!-- Login/Logout Button -->
    <button v-if="!auth.isAuthenticated" @click="openModal" class="disabled:opacity-50">
      {{ t('common.login') }}
    </button>
    <button v-else @click="auth.logout" :disabled="auth.isLoading" class="disabled:opacity-50">
      {{ auth.isLoading ? t('auth.loggingOut') : t('common.logout') }}
    </button>

    <!-- Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closeModal">
      <div class="bg-violet-950 rounded-lg shadow-xl p-6 max-w-md w-full mx-20">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">{{ t('common.login') }}</h2>
          <button @click="closeModal" class="text-gray-500 hover:text-gray-700" aria-label="Close modal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <input id="email" v-model="auth.email" type="email" placeholder="Email" :disabled="auth.isLoading"
              class="disabled:opacity-50 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div class="flex flex-col gap-2">
            <input id="password" v-model="auth.password" type="password" placeholder="Password"
              :disabled="auth.isLoading"
              class="disabled:opacity-50 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <span v-if="auth.error" class="text-red-500 text-sm">
            {{ auth.error }}
          </span>

          <button type="submit" :disabled="auth.isLoading"
            class="disabled:opacity-50 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
            {{ auth.isLoading ? t('auth.loggingIn') : t('common.login') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
