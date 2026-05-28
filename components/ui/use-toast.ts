"use client";

import { useEffect, useState } from "react";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastInput = Omit<Toast, "id">;

const listeners: Array<(toasts: Toast[]) => void> = [];
let memoryToasts: Toast[] = [];

export function toast(input: ToastInput) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const nextToast = {
    id,
    ...input,
  };

  memoryToasts = [nextToast, ...memoryToasts].slice(0, 3);
  emitChange();

  window.setTimeout(() => dismissToast(id), 3500);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);

  useEffect(() => {
    listeners.push(setToasts);

    return () => {
      const index = listeners.indexOf(setToasts);

      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    dismiss: dismissToast,
    toasts,
  };
}

function dismissToast(id: string) {
  memoryToasts = memoryToasts.filter((toastItem) => toastItem.id !== id);
  emitChange();
}

function emitChange() {
  listeners.forEach((listener) => listener(memoryToasts));
}
