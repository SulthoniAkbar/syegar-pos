"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { api } from "@/components/api";
import { LoadingScreen } from "@/components/common/page-primitives";
import { NotificationCenter } from "@/components/NotificationCenter";
import { cashierNavGroups, ownerNavGroups } from "@/components/navigation";
import type { UserRole, View } from "@/components/navigation";
import { SecondaryButton } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";

import type { User } from "@/types/app-ui";
import { DashboardView } from "@/components/features/dashboard/DashboardView";
import { CashierView } from "@/components/features/kasir/CashierView";
import { MenusView } from "@/components/features/menu/MenusView";
import { CategoriesView } from "@/components/features/kategori/CategoriesView";
import { OptionsView } from "@/components/features/varian-topping/OptionsView";
import { IngredientsView } from "@/components/features/bahan-baku/IngredientsView";
import { StockPurchasesView } from "@/components/features/stok-masuk/StockPurchasesView";
import { RecipesView } from "@/components/features/resep-menu/RecipesView";
import { StockView } from "@/components/features/stok/StockView";
import { StockOpnameView } from "@/components/features/stock-opname/StockOpnameView";
import { ShiftView } from "@/components/features/tutup-shift/ShiftView";
import { ReportsView } from "@/components/features/laporan/ReportsView";
import { AdminFinanceView } from "@/components/features/admin-keuangan/AdminFinanceView";
import { UsersView } from "@/components/features/users/UsersView";

export default function SyegarApp({ view }: { view: View }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const resetAuth = useAuthStore((state) => state.reset);

  useEffect(() => {
    api<User | null>("/api/auth/me")
      .then((me) => {
        if (!me) router.replace("/login");
        setUser(me);
      })
      .catch(() => {
        setUser(null);
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router, setLoading, setUser]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    resetAuth();
    router.push("/login");
  }

  if (loading) return <LoadingScreen />;
  if (!user) return <LoadingScreen label="Mengalihkan ke halaman login..." />;

  const isKasir = user.role === "KASIR";
  const visibleNavGroups = (isKasir ? cashierNavGroups : ownerNavGroups)
    .map((group) => ({ ...group, items: group.items.filter(([id]) => id !== "users" || user.role === "SUPER_ADMIN") }))
    .filter((group) => group.items.length);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-black/10 bg-white/80 p-4 backdrop-blur lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="mb-5">
          <div className="text-2xl font-black text-leaf">SYEGAR POS</div>
          <div className="text-xs font-medium text-ink/55">{user.name} - {user.role}</div>
        </div>
        <nav className="grid gap-4">
          {visibleNavGroups.map((group) => (
            <div key={group.label} className="grid gap-1">
              <div className="px-3 text-[11px] font-black uppercase tracking-wide text-ink/40">{group.label}</div>
              {group.items.map(([id, label, Icon]) => (
                <Link key={id} href={`/${id}`} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${pathname === `/${id}` ? "bg-leaf text-white" : "text-ink/70 hover:bg-skysoft"}`}>
                  <Icon size={18} /> {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <SecondaryButton onClick={logout} className="mt-5 w-full">
          <LogOut size={16} /> Keluar
        </SecondaryButton>
      </aside>
      <main className="p-4 lg:p-6">
        <NotificationCenter />
        {view === "dashboard" && <DashboardView />}
        {view === "kasir" && <CashierView user={user} />}
        {view === "menu" && <MenusView />}
        {view === "kategori" && <CategoriesView />}
        {view === "varian-topping" && <OptionsView />}
        {view === "bahan-baku" && <IngredientsView />}
        {view === "stok-masuk" && <StockPurchasesView user={user} />}
        {view === "resep-menu" && <RecipesView />}
        {view === "stok" && <StockView />}
        {view === "stock-opname" && <StockOpnameView user={user} />}
        {view === "tutup-shift" && <ShiftView user={user} />}
        {view === "laporan" && <ReportsView />}
        {view === "admin-keuangan" && <AdminFinanceView />}
        {view === "users" && <UsersView currentUser={user} />}
      </main>
    </div>
  );
}
