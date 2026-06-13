"use client";

import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { api } from "@/components/api";
import { Button, Card, Field, Input } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";
import type { User } from "@/types/app-ui";

export default function LoginPage() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const user = await api<User>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      setUser(user);
      setLoading(false);
      window.location.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6">
          <div className="text-3xl font-black tracking-tight text-leaf">SYEGAR POS</div>
          <p className="mt-2 text-sm text-ink/60">Masuk untuk mulai transaksi.</p>
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-1 top-1 inline-flex size-8 items-center justify-center rounded-md text-ink/55 hover:bg-skysoft hover:text-ink"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {error && <div className="rounded-md bg-guava/10 px-3 py-2 text-sm font-medium text-guava">{error}</div>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <LogIn size={18} />}
            {submitting ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
