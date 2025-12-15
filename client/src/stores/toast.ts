import { defineStore } from "pinia";
import { ref } from "vue";

export type ToastType = "error" | "warning" | "success" | "info";

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration: number;
    createdAt: number;
}

export const useToastStore = defineStore("toast", () => {
    const toasts = ref<Toast[]>([]);

    function show(
        message: string,
        type: ToastType = "info",
        duration: number = 5000
    ) {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const toast: Toast = {
            id,
            message,
            type,
            duration,
            createdAt: Date.now(),
        };

        toasts.value.push(toast);

        if (duration > 0) {
            setTimeout(() => {
                dismiss(id);
            }, duration);
        }

        return id;
    }

    function dismiss(id: string) {
        const index = toasts.value.findIndex((t) => t.id === id);
        if (index !== -1) {
            toasts.value.splice(index, 1);
        }
    }

    function error(message: string, duration?: number) {
        return show(message, "error", duration);
    }

    function warning(message: string, duration?: number) {
        return show(message, "warning", duration);
    }

    function success(message: string, duration?: number) {
        return show(message, "success", duration);
    }

    function info(message: string, duration?: number) {
        return show(message, "info", duration);
    }

    function clear() {
        toasts.value = [];
    }

    return {
        toasts,
        show,
        dismiss,
        error,
        warning,
        success,
        info,
        clear,
    };
});
