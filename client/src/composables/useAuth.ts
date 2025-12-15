import { defineStore } from "pinia";
import { ref } from "vue";
import { login as apiLogin } from "~/data/appointmentsSource";

export const useAuth = defineStore(
    "auth",
    () => {
        const email = ref("");
        const password = ref("");
        const isLoading = ref(false);
        const isAuthenticated = ref(false);
        const error = ref<string | null>(null);

        async function login(userEmail: string, userPassword: string) {
            isLoading.value = true;
            error.value = null;

            try {
                await apiLogin(userEmail, userPassword);
                isAuthenticated.value = true;
                password.value = ""; // Clear password after successful login
                return true;
            } catch (err) {
                console.error("Failed to login:", err);
                error.value = err instanceof Error ? err.message : "Login failed";
                isAuthenticated.value = false;
                return false;
            } finally {
                isLoading.value = false;
            }
        }

        function logout() {
            isAuthenticated.value = false;
            password.value = "";
            error.value = null;
        }

        function clearError() {
            error.value = null;
        }

        return {
            email,
            password,
            isLoading,
            isAuthenticated,
            error,
            login,
            logout,
            clearError,
        };
    },
    {
        persist: {
            paths: ["email", "isAuthenticated"],
        },
    }
);
