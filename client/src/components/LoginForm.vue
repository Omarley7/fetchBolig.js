<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useI18n } from "vue-i18n";

const auth = useAuth();
const { t } = useI18n();
const isLogoutModalOpen = ref(false);

async function handleLogin() {
  if (await auth.login(auth.email, auth.password))
    auth.showLoginModal = false;
}

function openModal() {
  auth.showLoginModal = true;
}

function closeModal() {
  auth.showLoginModal = false;
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
    <div class="disabled:opacity-50 cursor-pointer p-2 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
      <div v-if="!auth.isAuthenticated" @click="openModal" :aria-label="t('common.login')">
        <img src="/icons/user-round-key.svg" :alt="t('common.login')"
          class="size-6 dark:invert" />
      </div>
      <div v-else @click="openLogoutModal" :disabled="auth.isLoading" :aria-label="t('common.logout')">
        <img src="/icons/log-out.svg" :alt="t('common.logout')"
          class="size-6 dark:invert" />
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="auth.showLoginModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeModal">
        <div
          class="bg-violet-50 dark:bg-violet-950 text-gray-900 dark:text-gray-100 border border-violet-200 dark:border-violet-800/50 rounded-lg shadow-xl p-6 max-w-md w-full mx-20">
          <div class="flex justify-between items-center mb-1">
            <h2 class="text-xl font-semibold">{{ t('common.login') }}</h2>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close modal">
              <img src="/icons/x.svg" alt="Close" class="size-6 dark:invert" />
            </button>
          </div>
          <p class="text-sm text-violet-600 dark:text-violet-400 mb-4">{{ t('auth.findboligCredentials') }}</p>

          <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <input id="email" v-model="auth.email" type="email" :placeholder="t('landing.emailPlaceholder')" :disabled="auth.isLoading"
                class="disabled:opacity-50 px-3 py-2 border border-violet-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-transparent" />
            </div>

            <div class="flex flex-col gap-2">
              <input id="password" v-model="auth.password" type="password" :placeholder="t('landing.passwordPlaceholder')"
                :disabled="auth.isLoading"
                class="disabled:opacity-50 px-3 py-2 border border-violet-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-transparent" />
            </div>

            <div class="flex items-center gap-2">
              <input id="remember" type="checkbox" v-model="auth.rememberPassword" :disabled="auth.isLoading" class="w-4 h-4 accent-violet-600" />
              <label for="remember" class="text-sm text-gray-600 dark:text-gray-300">{{ t('auth.rememberPassword') }}</label>
            </div>

            <button type="submit" :disabled="auth.isLoading"
              class="disabled:opacity-50 bg-violet-600 text-white px-4 py-2 rounded-md hover:bg-violet-700 transition-colors font-medium">
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
          class="bg-violet-50 dark:bg-violet-950 text-gray-900 dark:text-gray-100 border border-violet-200 dark:border-violet-800/50 rounded-lg shadow-xl p-6 max-w-sm w-full mx-20">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">{{ t('common.logout') }}</h2>
            <button @click="closeLogoutModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close modal">
              <img src="/icons/x.svg" alt="Close" class="size-6 dark:invert" />
            </button>
          </div>

          <p class="mb-6 text-gray-600 dark:text-gray-300">{{ t('auth.logoutConfirm') }}</p>

          <div class="flex gap-3 justify-end">
            <button @click="closeLogoutModal"
              class="px-4 py-2 rounded-md border border-violet-200 dark:border-violet-700 text-gray-700 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors">
              {{ t('auth.cancel') }}
            </button>
            <button @click="confirmLogout" :disabled="auth.isLoading"
              class="disabled:opacity-50 px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors font-medium">
              {{ auth.isLoading ? t('auth.loggingOut') : t('common.logout') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
