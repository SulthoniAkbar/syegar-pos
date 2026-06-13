"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { useCartStore } from "@/stores/cart.store";
import { Button, Card, Field, Input, SecondaryButton, Select } from "@/components/ui";
import { SimpleTable } from "@/components/tables";
import { HelpNote, Title } from "@/components/common/page-primitives";
import { MenuPhoto } from "@/components/common/menu-photo";
import { rupiah } from "@/utils/format";
import type { Menu, OptionGroup, User } from "@/types/app-ui";

export function CashierView({ user }: { user: User }) {
  const { data: menus, reload } = useData<Menu[]>("/api/menus", []);
  const { data: groups } = useData<OptionGroup[]>("/api/options", []);
  const { data: recentTransactions, reload: reloadTransactions } = useData<any[]>("/api/transactions", []);
  const { data: shiftData } = useData<any>("/api/shifts", null);
  const cart = useCartStore((state) => state.items);
  const addCartItem = useCartStore((state) => state.addItem);
  const updateCartQuantity = useCartStore((state) => state.updateQuantity);
  const removeCartItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clear);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<"TUNAI" | "QRIS">("TUNAI");
  const [cashReceived, setCashReceived] = useState(0);
  const [message, setMessage] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const categories = Array.from(new Set(menus.map((menu) => menu.category?.name).filter(Boolean))) as string[];
  const activeMenus = menus.filter((menu) => menu.active && (categoryFilter === "ALL" || menu.category?.name === categoryFilter) && menu.name.toLowerCase().includes(menuSearch.toLowerCase()));
  const chosenOptions = groups.flatMap((group) => group.options).filter((option) => selected[option.id]);
  const total = cart.reduce((sum, item) => sum + (item.menu.price + item.options.reduce((s, option) => s + option.extraPrice, 0)) * item.quantity, 0);
  const shiftLoaded = shiftData !== null;
  const activeShift = shiftData?.activeShift;

  async function pay() {
    setMessage("");
    try {
      if (shiftLoaded && !activeShift) throw new Error("Mulai kasir terlebih dahulu sebelum transaksi.");
      await api("/api/transactions", {
        method: "POST",
        body: JSON.stringify({ cashierId: user.id, paymentMethod, cashReceived, items: cart.map((item) => ({ menuId: item.menu.id, quantity: item.quantity, options: item.options.map((option) => ({ optionId: option.id, optionName: option.name, extraPrice: option.extraPrice })) })) })
      });
      clearCart();
      setCashReceived(0);
      setMessage("Transaksi tersimpan dan stok sudah dikurangi.");
      reload();
      reloadTransactions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transaksi gagal");
    }
  }

  return (
    <>
      <Title title="Kasir / Transaksi" subtitle="Tombol menu besar, pilihan varian/topping, pembayaran tunai atau QRIS." />
      <HelpNote items={["Mulai kasir dulu sebelum transaksi, supaya semua penjualan masuk ke ringkasan tutup kasir.", "Untuk tunai, isi uang yang benar-benar diberikan pelanggan. Sistem menghitung kembalian otomatis."]} />
      {shiftLoaded && !activeShift && (
        <Card className="mb-4 grid gap-3 border-mango/40 bg-mango/10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="font-bold">Kasir belum dimulai</h2>
            <p className="text-sm text-ink/65">Buka shift di halaman Tutup Kasir sebelum menerima transaksi.</p>
          </div>
          <Link href="/tutup-shift" className="inline-flex h-10 items-center justify-center rounded-md bg-leaf px-4 text-sm font-bold text-white">Mulai Kasir</Link>
        </Card>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="grid gap-4">
          <Card>
            <h2 className="mb-3 font-bold">Varian & Topping</h2>
            <div className="flex flex-wrap gap-2">
              {groups.flatMap((group) => group.options).map((option) => (
                <button key={option.id} onClick={() => setSelected((state) => ({ ...state, [option.id]: !state[option.id] }))} className={`rounded-md border px-3 py-2 text-sm font-semibold ${selected[option.id] ? "border-leaf bg-leaf text-white" : "border-black/10 bg-white"}`}>
                  {option.name} {option.extraPrice ? `+${rupiah(option.extraPrice)}` : ""}
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <Input placeholder="Cari menu..." value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} />
              <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="ALL">Semua kategori</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </Select>
            </div>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {activeMenus.map((menu) => (
              <button key={menu.id} onClick={() => { addCartItem({ menu, quantity: 1, options: chosenOptions }); setSelected({}); }} className="overflow-hidden rounded-lg border border-black/10 bg-white text-left shadow-soft transition hover:-translate-y-0.5 hover:border-leaf">
                <MenuPhoto menu={menu} className="h-32 w-full" />
                <div className="p-4">
                  <div className="text-lg font-black">{menu.name}</div>
                  <div className="mt-2 text-sm text-ink/55">{menu.category?.name}</div>
                  {!menu.recipes?.length && <div className="mt-2 rounded-md bg-mango/20 px-2 py-1 text-xs font-bold text-ink/70">Belum ada resep stok</div>}
                  <div className="mt-3 font-bold text-leaf">{rupiah(menu.price)}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
        <Card className="h-fit">
          <h2 className="mb-3 font-bold">Keranjang</h2>
          <div className="grid gap-2">
            {cart.map((item, index) => (
              <div key={index} className="rounded-md bg-skysoft p-3">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-bold">{item.menu.name}</div><div className="text-xs text-ink/55">{item.options.map((option) => option.name).join(", ") || "Tanpa opsi"}</div></div>
                  <button onClick={() => removeCartItem(index)} className="text-guava"><Trash2 size={16} /></button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input type="number" min={1} value={item.quantity} onChange={(event) => updateCartQuantity(index, Number(event.target.value))} />
                  <div className="w-32 text-right font-bold">{rupiah((item.menu.price + item.options.reduce((sum, option) => sum + option.extraPrice, 0)) * item.quantity)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="my-4 border-t border-black/10 pt-4 text-2xl font-black">{rupiah(total)}</div>
          <div className="grid gap-3">
            <Field label="Metode Bayar"><Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "TUNAI" | "QRIS")}><option value="TUNAI">Tunai</option><option value="QRIS">QRIS</option></Select></Field>
            {paymentMethod === "TUNAI" && <Field label="Uang Diterima"><Input type="number" value={cashReceived} onChange={(event) => setCashReceived(Number(event.target.value))} /></Field>}
            {paymentMethod === "TUNAI" && <div className="grid grid-cols-3 gap-2">{[20000, 50000, 100000].map((amount) => <SecondaryButton key={amount} onClick={() => setCashReceived(amount)}>{rupiah(amount)}</SecondaryButton>)}</div>}
            {paymentMethod === "TUNAI" && <div className="text-sm font-bold">Kembalian: {rupiah(Math.max(0, cashReceived - total))}</div>}
            <Button disabled={!cart.length || (shiftLoaded && !activeShift)} onClick={pay}>{paymentMethod === "QRIS" ? "Sudah Dibayar" : "Simpan Transaksi"}</Button>
            {message && <div className="rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="mb-3 font-bold">Transaksi Terakhir</h2>
        <SimpleTable headers={["Waktu", "Nota", "Metode", "Status", "Total"]} rows={recentTransactions.slice(0, 5).map((transaction) => [new Date(transaction.paidAt).toLocaleString("id-ID"), transaction.receiptNumber, transaction.paymentMethod, transaction.status, rupiah(transaction.total)])} empty="Belum ada transaksi." />
      </Card>
    </>
  );
}
