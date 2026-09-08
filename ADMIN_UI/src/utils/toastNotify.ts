import type { ToastType } from "../context/ToastContext";

type ToastPush = (toast: {
  type: ToastType;
  title: string;
  description: string;
}) => void;

export const createToastNotify = (push: ToastPush) => ({
  success: (title: string, description: string) =>
    push({ type: "success", title, description }),
  error: (title: string, description: string) =>
    push({ type: "error", title, description }),
  info: (title: string, description: string) =>
    push({ type: "info", title, description }),
});
