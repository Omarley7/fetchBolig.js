import { watch, type WritableComputedRef } from "vue";
import i18n from "~/i18n";

const STORAGE_KEY = "locale-preference";
type Locale = "da" | "en";

const locale = i18n.global.locale as unknown as WritableComputedRef<Locale>;

function getStoredLocale(): Locale | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "da" || stored === "en") return stored;
  return null;
}

function apply(loc: Locale) {
  document.documentElement.lang = loc;
}

// Apply stored preference on load
const stored = getStoredLocale();
if (stored) {
  locale.value = stored;
}
apply(locale.value);

watch(locale, (val) => {
  localStorage.setItem(STORAGE_KEY, val);
  apply(val);
});

export function useLocale() {
  function toggle() {
    locale.value = locale.value === "da" ? "en" : "da";
  }

  return { locale, toggle };
}
