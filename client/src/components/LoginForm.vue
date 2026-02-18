<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useI18n } from "vue-i18n";

const auth = useAuth();
const { t } = useI18n();
const isModalOpen = ref(false);
const isLogoutModalOpen = ref(false);

async function handleLogin() {
  if (await auth.login(auth.email, auth.password))
    isModalOpen.value = false;
}

function openModal() {
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
}

function openLogoutModal() {
  isLogoutModalOpen.value = true;
}

function closeLogoutModal() {
  isLogoutModalOpen.value = false;
}

function confirmLogout() {
  isLogoutModalOpen.value = false;
  auth.logout();
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
      <div v-else @click="openLogoutModal" :disabled="auth.isLoading" :aria-label="t('common.logout')">
        <img src="https://unpkg.com/lucide-static@latest/icons/log-out.svg" :alt="t('common.logout')"
          class="size-6 dark:invert" />
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeModal">
        <div
          class="bg-white dark:bg-violet-950 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-6 max-w-md w-full mx-20">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">{{ t('common.login') }}</h2>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close modal">
              <img src="https://unpkg.com/lucide-static@latest/icons/x.svg" alt="Close" class="size-6 dark:invert" />
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
    </Teleport>

    <!-- Logout Confirmation Modal -->
    <Teleport to="body">
      <div v-if="isLogoutModalOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeLogoutModal">
        <div
          class="bg-white dark:bg-violet-950 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-6 max-w-sm w-full mx-20">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">{{ t('common.logout') }}</h2>
            <button @click="closeLogoutModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close modal">
              <img src="https://unpkg.com/lucide-static@latest/icons/x.svg" alt="Close" class="size-6 dark:invert" />
            </button>
          </div>

          <p class="mb-6 text-gray-600 dark:text-gray-300">{{ t('auth.logoutConfirm') }}</p>

          <div class="flex gap-3 justify-end">
            <button @click="closeLogoutModal" class="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300">
              {{ t('auth.cancel') }}
            </button>
            <button @click="confirmLogout" :disabled="auth.isLoading"
              class="disabled:opacity-50 px-4 py-2 rounded-md text-gray-700 dark:text-gray-300">
              {{ auth.isLoading ? t('auth.loggingOut') : t('common.logout') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
