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
    const cookies = ref<string>("");

    async function login(userEmail: string, userPassword: string) {
      isLoading.value = true;
      error.value = null;

      try {
        const result = await apiLogin(userEmail, userPassword);
        if (result.success && result.cookies) {
          isAuthenticated.value = true;
          // Convert array of Set-Cookie headers to a single cookie string
          cookies.value = parseCookies(result.cookies);
          password.value = ""; // Clear password after successful login
          return true;
        } else {
          isAuthenticated.value = false;
          cookies.value = "";
          return false;
        }
      } catch (err) {
        console.error("Failed to login:", err);
        error.value = err instanceof Error ? err.message : "Login failed";
        isAuthenticated.value = false;
        cookies.value = "";
        return false;
      } finally {
        isLoading.value = false;
      }
    }

    function logout() {
      isAuthenticated.value = false;
      password.value = "";
      cookies.value = "";
      error.value = null;
    }

    function clearError() {
      error.value = null;
    }

    /**
     * Parse Set-Cookie headers into a cookie string suitable for Cookie header
     */
    function parseCookies(setCookieHeaders: string[]): string {
      return setCookieHeaders
        .map((header) => {
          // Extract the cookie name=value pair (before the first semicolon)
          const match = header.match(/^([^;]+)/);
          return match ? match[1] : "";
        })
        .filter(Boolean)
        .join("; ");
    }

    return {
      email,
      password,
      isLoading,
      isAuthenticated,
      error,
      cookies,
      login,
      logout,
      clearError,
    };
  },
  {
    persist: {
      paths: ["email", "isAuthenticated", "cookies"],
    },
  }
);
