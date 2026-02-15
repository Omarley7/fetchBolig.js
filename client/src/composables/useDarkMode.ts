import { ref, watch } from "vue";

const STORAGE_KEY = "theme-preference";

const isDark = ref(getInitialValue());

function getInitialValue(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

// Apply on load
apply(isDark.value);

watch(isDark, (val) => {
  localStorage.setItem(STORAGE_KEY, val ? "dark" : "light");
  apply(val);
});

export function useDarkMode() {
  function toggle() {
    isDark.value = !isDark.value;
  }

  return { isDark, toggle };
}
