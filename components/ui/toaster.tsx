"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { dismiss, toasts } = useToast();

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          className={cn(
            "rounded-lg border border-white/10 bg-[#111827] p-4 text-white shadow-lg shadow-black/30",
            toast.variant === "destructive" && "border-red-300/30",
          )}
          key={toast.id}
          role="status"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              {toast.title ? (
                <p className="text-sm font-semibold tracking-normal">
                  {toast.title}
                </p>
              ) : null}
              {toast.description ? (
                <p className="text-sm leading-6 text-slate-300">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <Button
              aria-label="Dismiss notification"
              className="size-8 shrink-0 border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.08] hover:text-white"
              onClick={() => dismiss(toast.id)}
              size="icon"
              type="button"
              variant="outline"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
