"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
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

const viewLoading = () => (
  <div className="flex min-h-[60vh] items-center justify-center text-sm font-medium text-ink/60">
    Memuat halaman...
  </div>
);
const CashierView = dynamic(() => import("@/components/features/kasir/CashierView").then((mod) => mod.CashierView), { loading: viewLoading });
const MenusView = dynamic(() => import("@/components/features/menu/MenusView").then((mod) => mod.MenusView), { loading: viewLoading });
const CategoriesView = dynamic(() => import("@/components/features/kategori/CategoriesView").then((mod) => mod.CategoriesView), { loading: viewLoading });
const OptionsView = dynamic(() => import("@/components/features/varian-topping/OptionsView").then((mod) => mod.OptionsView), { loading: viewLoading });
const IngredientsView = dynamic(() => import("@/components/features/bahan-baku/IngredientsView").then((mod) => mod.IngredientsView), { loading: viewLoading });
const StockPurchasesView = dynamic(() => import("@/components/features/stok-masuk/StockPurchasesView").then((mod) => mod.StockPurchasesView), { loading: viewLoading });
const RecipesView = dynamic(() => import("@/components/features/resep-menu/RecipesView").then((mod) => mod.RecipesView), { loading: viewLoading });
const StockView = dynamic(() => import("@/components/features/stok/StockView").then((mod) => mod.StockView), { loading: viewLoading });
const StockOpnameView = dynamic(() => import("@/components/features/stock-opname/StockOpnameView").then((mod) => mod.StockOpnameView), { loading: viewLoading });
const ShiftView = dynamic(() => import("@/components/features/tutup-shift/ShiftView").then((mod) => mod.ShiftView), { loading: viewLoading });
const ReportsView = dynamic(() => import("@/components/features/laporan/ReportsView").then((mod) => mod.ReportsView), { loading: viewLoading });
const AdminFinanceView = dynamic(() => import("@/components/features/admin-keuangan/AdminFinanceView").then((mod) => mod.AdminFinanceView), { loading: viewLoading });
const UsersView = dynamic(() => import("@/components/features/users/UsersView").then((mod) => mod.UsersView), { loading: viewLoading });

export default function SyegarApp({ view, initialUser, initialDashboardData }: { view: View; initialUser?: User; initialDashboardData?: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const resetAuth = useAuthStore((state) => state.reset);
  const activeUser = user ?? initialUser ?? null;
  const isLoading = initialUser ? false : loading;

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setLoading(false);
      return;
    }
    if (user) {
      setLoading(false);
      return;
    }
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
  }, [initialUser, router, setLoading, setUser, user]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    resetAuth();
    router.push("/login");
  }

  if (isLoading) return <LoadingScreen />;
  if (!activeUser) return <LoadingScreen label="Mengalihkan ke halaman login..." />;

  const isKasir = activeUser.role === "KASIR";
  const visibleNavGroups = (isKasir ? cashierNavGroups : ownerNavGroups)
    .map((group) => ({ ...group, items: group.items.filter(([id]) => id !== "users" || activeUser.role === "SUPER_ADMIN") }))
    .filter((group) => group.items.length);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-black/10 bg-white/80 p-4 backdrop-blur lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="mb-5">
          <div className="text-2xl font-black text-leaf">SYEGAR POS</div>
          <div className="text-xs font-medium text-ink/55">{activeUser.name} - {activeUser.role}</div>
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
        <NotificationCenter initialNotifications={initialDashboardData?.notifications} />
        {view === "dashboard" && <DashboardView initialData={initialDashboardData} />}
        {view === "kasir" && <CashierView user={activeUser} />}
        {view === "menu" && <MenusView />}
        {view === "kategori" && <CategoriesView />}
        {view === "varian-topping" && <OptionsView />}
        {view === "bahan-baku" && <IngredientsView />}
        {view === "stok-masuk" && <StockPurchasesView user={activeUser} />}
        {view === "resep-menu" && <RecipesView />}
        {view === "stok" && <StockView />}
        {view === "stock-opname" && <StockOpnameView user={activeUser} />}
        {view === "tutup-shift" && <ShiftView user={activeUser} />}
        {view === "laporan" && <ReportsView />}
        {view === "admin-keuangan" && <AdminFinanceView />}
        {view === "users" && <UsersView currentUser={activeUser} />}
      </main>
    </div>
  );
}
