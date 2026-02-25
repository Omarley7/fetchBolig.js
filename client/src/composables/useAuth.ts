import { defineStore } from "pinia";
import { ref } from "vue";
import { login as apiLogin, handleApiError } from "~/data/appointmentsSource";
import { useToastStore } from "~/stores/toast";
import { useI18n } from "~/i18n";
import config from "~/config";

const TIMEOUT_REFRESH = 15_000; // 15s – background session checks

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
    const showLoginModal = ref(false);
    let keepAliveTimer: number | null = null;
    const toast = useToastStore();

    async function login(userEmail: string, userPassword: string) {
      isLoading.value = true;

      try {
        const userData = await apiLogin(userEmail, userPassword);
        if (!userData)
          return setAuthenticated(false);

        if (!userData.cookies?.length) { // Login succeeded but no cookies received - this shouldn't happen
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
        handleApiError(err, toast, useI18n().t, "Login failed unexpectedly...", "errors.timeoutLogin");
        return setAuthenticated(false);
      } finally {
        isLoading.value = false;
      }
    }

    function setAuthenticated(value: boolean, newCookies?: string, newName?: string) {
      isAuthenticated.value = value;
      // Only clear password if the user didn't ask to remember it
      if (!rememberPassword.value) password.value = "";
      if (newCookies !== undefined) cookies.value = newCookies;
      if (newName !== undefined) name.value = newName;
      if (!value) stopKeepAlive();
      return value;
    }

    function startKeepAlive() {
      stopKeepAlive();
      // attempt refresh every 5 minutes
      keepAliveTimer = window.setInterval(async () => {
        try {
          if (!cookies.value) return;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), TIMEOUT_REFRESH);
          const res = await fetch(`${config.backendDomain}/api/auth/refresh`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-findbolig-cookies": cookies.value,
            },
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!res.ok) {
            // if unauthorized, mark logged out
            if (res.status === 401) {
              setAuthenticated(false, "", "");
            }
            return;
          }

          const data = await res.json();
          if (data?.cookies?.length) {
            cookies.value = parseCookies(data.cookies);
          }
          if (data && data.fullName) {
            name.value = data.fullName;
          }
        } catch (e) {
          console.error("Keep-alive failed:", e);
        }
      }, 3 * 60 * 1000);
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
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_REFRESH);
        const res = await fetch(`${config.backendDomain}/api/auth/refresh`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-findbolig-cookies": cookies.value,
          },
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          if (res.status === 401) {
            setAuthenticated(false, "", "");
          }
          return false;
        }

        const data = await res.json();
        if (data?.cookies?.length) cookies.value = parseCookies(data.cookies);
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

      // Definitively cannot recover session — clear stale auth state
      setAuthenticated(false, "", "");
      return false;
    }

    // resume keep-alive if already authenticated on startup
    if (isAuthenticated.value) startKeepAlive();

    // Validate session when tab regains focus (Page Visibility API)
    let lastVisibilityCheck = 0;
    const VISIBILITY_COOLDOWN = 30_000; // 30 seconds

    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState !== "visible") return;
      if (!isAuthenticated.value) return;

      const now = Date.now();
      if (now - lastVisibilityCheck < VISIBILITY_COOLDOWN) return;
      lastVisibilityCheck = now;

      const valid = await validateSession();
      if (!valid) await ensureSession();
    });

    return { email, password, isLoading, isAuthenticated, cookies, name, rememberPassword, showLoginModal, login, logout, startKeepAlive, stopKeepAlive, validateSession, ensureSession };
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