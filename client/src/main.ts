import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { createApp } from "vue";
import App from "~/App.vue";
import { useDarkMode } from "~/composables/useDarkMode";
import i18n from "~/i18n";
import router from "~/router";
import "~/style.css";

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(i18n);
app.use(router);

// Initialize dark mode (applies class to <html> before mount)
useDarkMode();

app.mount("#app");
