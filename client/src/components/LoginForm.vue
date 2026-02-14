<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useI18n } from "vue-i18n";

const auth = useAuth();
const { t } = useI18n();
const isModalOpen = ref(false);

async function handleLogin() {
  if (await auth.login(auth.email, auth.password)) {
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
    <div class="disabled:opacity-50 cursor-pointer p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
      <div v-if="!auth.isAuthenticated" @click="openModal" :aria-label="t('common.login')">
        <img src="https://unpkg.com/lucide-static@latest/icons/user-round-key.svg" :alt="t('common.login')"
          class="size-6 " />
      </div>
      <div v-else @click="auth.logout" :disabled="auth.isLoading" :aria-label="t('common.logout')">
        <img src="https://unpkg.com/lucide-static@latest/icons/log-out.svg" :alt="t('common.logout')"
          class="size-6 dark:invert" />
      </div>
    </div>

    <!-- Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closeModal">
      <div class="bg-violet-950 rounded-lg shadow-xl p-6 max-w-md w-full mx-20">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">{{ t('common.login') }}</h2>
          <button @click="closeModal" class="text-gray-500 hover:text-gray-700" aria-label="Close modal">
            <img src="https://unpkg.com/lucide-static@latest/icons/x.svg" alt="Close" class="size-6" />
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

          <button type="submit" :disabled="auth.isLoading"
            class="disabled:opacity-50 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
            {{ auth.isLoading ? t('auth.loggingIn') : t('common.login') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
