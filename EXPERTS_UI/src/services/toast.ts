import type { ToastType } from "../context/ToastContext";

type ToastFn = (type: ToastType, title: string, description?: string) => void;

let emit: ToastFn | null = null;

export const registerToastEmitter = (fn: ToastFn | null) => {
  emit = fn;
};

export const toast = {
  success(title: string, description?: string) {
    emit?.("success", title, description);
  },
  error(title: string, description?: string) {
    emit?.("error", title, description);
  },
  info(title: string, description?: string) {
    emit?.("info", title, description);
  },
};

