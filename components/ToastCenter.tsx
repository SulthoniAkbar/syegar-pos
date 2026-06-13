"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

type ToastKind = "success" | "error";
type ToastEvent = {
  id: string;
  kind: ToastKind;
  message: string;
};

const eventName = "syegar:toast";

export function showToast(kind: ToastKind, message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail: { kind, message } }));
}

export function ToastCenter() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<{ kind: ToastKind; message: string }>).detail;
      if (!detail?.message) return;
      const toast = { id: crypto.randomUUID(), kind: detail.kind, message: detail.message };
      setToasts((items) => [...items, toast].slice(-4));
      window.setTimeout(() => {
        setToasts((items) => items.filter((item) => item.id !== toast.id));
      }, 4200);
    }

    window.addEventListener(eventName, onToast);
    return () => window.removeEventListener(eventName, onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-4 z-50 grid w-[min(380px,calc(100vw-2rem))] gap-2">
      {toasts.map((toast) => {
        const Icon = toast.kind === "success" ? CheckCircle2 : AlertTriangle;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-md border bg-white p-3 text-sm shadow-soft ${
              toast.kind === "success" ? "border-leaf/25 text-ink" : "border-guava/25 text-guava"
            }`}
            role="status"
          >
            <Icon size={18} className={toast.kind === "success" ? "mt-0.5 shrink-0 text-leaf" : "mt-0.5 shrink-0 text-guava"} />
            <div className="min-w-0 flex-1 font-semibold">{toast.message}</div>
            <button
              type="button"
              onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}
              className="rounded-md p-0.5 text-ink/45 hover:bg-black/5 hover:text-ink"
              aria-label="Tutup notifikasi"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
