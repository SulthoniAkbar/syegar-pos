"use client";

import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/components/api";
import { Button, Card, Field, Input } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";
import type { User } from "@/types/app-ui";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("owner123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const user = await api<User>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      setUser(user);
      setLoading(false);
      router.replace("/dashboard");
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
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <div className="rounded-md bg-guava/10 px-3 py-2 text-sm font-medium text-guava">{error}</div>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <LogIn size={18} />}
            {submitting ? "Memproses..." : "Masuk"}
          </Button>
          <div className="rounded-md bg-skysoft px-3 py-2 text-xs text-ink/70">Akun awal: superadmin/superadmin123, owner/owner123, atau kasir/kasir123</div>
        </form>
      </Card>
    </main>
  );
}
