"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-leaf px-4 text-sm font-bold text-white shadow-sm ring-1 ring-leaf/30 transition hover:bg-[#24633e] disabled:cursor-not-allowed disabled:bg-ink/25 disabled:text-white disabled:ring-transparent",
        className
      )}
      {...props}
    />
  );
}

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button className={clsx("bg-[#eef6f5] text-ink ring-1 ring-ink/25 hover:bg-[#d9ece9] hover:text-ink disabled:bg-ink/10 disabled:text-ink/45", className)} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("focus-ring h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx("focus-ring h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx("focus-ring min-h-24 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm", props.className)} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={clsx("rounded-lg border border-black/10 bg-white/88 p-4 shadow-soft backdrop-blur", className)} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink/75">
      {label}
      {children}
    </label>
  );
}
