import { useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { registerToastEmitter } from "../../services/toast";
import type { ToastType } from "../../context/ToastContext";

function ToastBridge() {
  const { push } = useToast();

  useEffect(() => {
    registerToastEmitter((type: ToastType, title: string, description?: string) => {
      push({ type, title, description });
    });
    return () => registerToastEmitter(null);
  }, [push]);

  return null;
}

export default ToastBridge;

