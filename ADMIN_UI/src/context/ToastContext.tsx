import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  type: ToastType;
  title: string;
  description: string;
  durationMs?: number;
};

type ToastInput = Omit<Toast, "id">;

type ToastContextValue = {
  toasts: Toast[];
  push: (toast: ToastInput) => string;
  remove: (id: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const randomId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const defaultDescriptionByType: Record<ToastType, string> = {
  success: "Operation completed successfully.",
  error: "Please check and try again.",
  info: "Please review the update.",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
    Object.values(timersRef.current).forEach((t) => window.clearTimeout(t));
    timersRef.current = {};
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = randomId();
      const toast: Toast = {
        id,
        ...input,
        description:
          (input.description || "").trim() || defaultDescriptionByType[input.type],
      };
      setToasts((prev) => [toast, ...prev].slice(0, 5));

      const duration = input.durationMs ?? (input.type === "error" ? 5000 : 3500);
      timersRef.current[id] = window.setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, push, remove, clear }),
    [toasts, push, remove, clear]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
