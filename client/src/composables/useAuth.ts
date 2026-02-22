import { defineStore } from "pinia";
import { ref } from "vue";
import { login as apiLogin } from "~/data/appointmentsSource";
import { useToastStore } from "~/stores/toast";
import config from "~/config";

export const useAuth = defineStore(
  "auth",
  () => {
    const email = ref("");
    const password = ref("");
    const isLoading = ref(false);
    const isAuthenticated = ref(false);
    const cookies = ref<string>("");
    const name = ref("");
    const rememberPassword = ref(false);
    let keepAliveTimer: number | null = null;
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

        // store password locally only if user opted in
        if (rememberPassword.value) {
          password.value = userPassword;
        }

        const ok = setAuthenticated(true, parseCookies(userData.cookies), userData.fullName);
        if (ok) startKeepAlive();
        return ok;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Login failed unexpectedly...");
        return setAuthenticated(false);
      } finally {
        isLoading.value = false;
      }
    }

    function setAuthenticated(value: boolean, newCookies?: string, newName?: string) {
      isAuthenticated.value = value;
      // Only clear password if the user didn't ask to remember it
      if (!rememberPassword.value) password.value = "";
      if (newCookies) cookies.value = newCookies;
      if (newName) name.value = newName;
      if (!value) stopKeepAlive();
      return value;
    }

    function startKeepAlive() {
      stopKeepAlive();
      // attempt refresh every 5 minutes
      keepAliveTimer = window.setInterval(async () => {
        try {
          if (!cookies.value) return;
          const res = await fetch(`${config.backendDomain}/api/auth/refresh`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-findbolig-cookies": cookies.value,
            },
          });

          if (!res.ok) {
            // if unauthorized, mark logged out
            if (res.status === 401) {
              setAuthenticated(false, "", "");
            }
            return;
          }

          const data = await res.json();
          if (data && data.cookies) {
            cookies.value = parseCookies(data.cookies);
          }
          if (data && data.fullName) {
            name.value = data.fullName;
          }
        } catch (e) {
          console.error("Keep-alive failed:", e);
        }
      }, 5 * 60 * 1000);
    }

    function stopKeepAlive() {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
    }

    function logout() {
      setAuthenticated(false, "");
      // optionally clear stored password on logout unless remembering is enabled
      if (!rememberPassword.value) password.value = "";
    }

    async function validateSession(): Promise<boolean> {
      if (!cookies.value) return false;
      try {
        const res = await fetch(`${config.backendDomain}/api/auth/refresh`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-findbolig-cookies": cookies.value,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            setAuthenticated(false, "", "");
          }
          return false;
        }

        const data = await res.json();
        if (data?.cookies) cookies.value = parseCookies(data.cookies);
        if (data?.fullName) name.value = data.fullName;
        return true;
      } catch {
        // Network error — don't clear auth (user might be offline with valid cache)
        return false;
      }
    }

    async function ensureSession(): Promise<boolean> {
      // 1. Try existing session first
      if (cookies.value) {
        const valid = await validateSession();
        if (valid) return true;
      }

      // 2. Session invalid — try auto-relogin if credentials are remembered
      if (rememberPassword.value && email.value && password.value) {
        const ok = await login(email.value, password.value);
        return !!ok;
      }

      // 3. No stored credentials — user must log in manually
      return false;
    }

    // resume keep-alive if already authenticated on startup
    if (isAuthenticated.value) startKeepAlive();

    return { email, password, isLoading, isAuthenticated, cookies, name, rememberPassword, login, logout, startKeepAlive, stopKeepAlive, validateSession, ensureSession };
  },
  {
    persist: {
      paths: ["email", "isAuthenticated", "cookies", "name", "rememberPassword", "password"],
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