import { createI18n } from "vue-i18n";
import da from "./locales/da";
import en from "./locales/en";

export type MessageSchema = typeof da;

const i18n = createI18n<[MessageSchema], "da" | "en">({
    legacy: false,
    locale: "da",
    fallbackLocale: "en",
    messages: {
        da,
        en,
    },
});

export default i18n;

export function useI18n() {
    return i18n.global;
}
