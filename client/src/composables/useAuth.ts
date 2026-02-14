import { defineStore } from "pinia";
import { ref } from "vue";
import { login as apiLogin } from "~/data/appointmentsSource";
import { useToastStore } from "~/stores/toast";

export const useAuth = defineStore(
  "auth",
  () => {
    const email = ref("");
    const password = ref("");
    const isLoading = ref(false);
    const isAuthenticated = ref(false);
    const cookies = ref<string>("");
    const name = ref("");
    const toast = useToastStore();

    async function login(userEmail: string, userPassword: string) {
      isLoading.value = true;

      try {
        const userData = await apiLogin(userEmail, userPassword);
        if (!userData)
          return setAuthenticated(false);

        if (!userData.cookies) { // Login succeeded but no cookies received - this shouldn't happen
          toast.error("Login successful but no authentication cookies received. Please try again.");
          return setAuthenticated(false);
        }

        return setAuthenticated(true, parseCookies(userData.cookies), userData.fullName);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Login failed unexpectedly...");
        return setAuthenticated(false);
      } finally {
        isLoading.value = false;
      }
    }

    function setAuthenticated(value: boolean, newCookies?: string, newName?: string) {
      isAuthenticated.value = value;
      password.value = "";
      if (newCookies)
        cookies.value = newCookies;
      if (newName)
        name.value = newName;
      return value;
    }

    function logout() {
      setAuthenticated(false, "");
    }

    return { email, password, isLoading, isAuthenticated, cookies, name, login, logout };
  },
  {
    persist: {
      paths: ["email", "isAuthenticated", "cookies"],
    },
  },
);


/**
 * Parse Set-Cookie headers into a cookie string suitable for Cookie header
 */
function parseCookies(setCookieHeaders: string[]): string {
  if (!setCookieHeaders || setCookieHeaders.length === 0) {
    return "";
  }

  return setCookieHeaders
    .filter((header) => typeof header === "string" && header.length > 0)
    .map((header) => {
      // Extract the cookie name=value pair (before the first semicolon)
      const match = header.match(/^([^;]+)/);
      return match ? match[1].trim() : "";
    })
    .filter(Boolean)
    .join("; ");
}