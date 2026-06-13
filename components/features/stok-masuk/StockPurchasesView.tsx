"use client";

import { useMemo, useState } from "react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { PaginationControls, usePagination } from "@/components/shared-state";
import { SimpleTable } from "@/components/tables";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { HelpNote, Title } from "@/components/common/page-primitives";
import { numberId, rupiah } from "@/utils/format";
import type { Ingredient, User } from "@/types/app-ui";

export function StockPurchasesView({ user }: { user: User }) {
  const { data: ingredients, reload: reloadIngredients } = useData<Ingredient[]>("/api/ingredients", []);
  const { data: purchases, reload } = useData<any[]>("/api/stock-purchases", []);
  const [form, setForm] = useState({ ingredientId: "", quantity: 0, purchaseAmount: 0, paymentMethod: "TUNAI", supplier: "", note: "" });
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const canEdit = user.role === "OWNER" || user.role === "SUPER_ADMIN";
  const filteredPurchases = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return purchases.filter((purchase) => !keyword || purchase.ingredientName.toLowerCase().includes(keyword) || (purchase.supplier ?? "").toLowerCase().includes(keyword));
  }, [purchases, search]);
  const purchasePages = usePagination(filteredPurchases, 10);

  async function save() {
    setMessage("");
    await api("/api/stock-purchases", { method: "POST", body: JSON.stringify({ ...form, ingredientId: form.ingredientId || ingredients[0]?.id }) });
    setForm({ ingredientId: "", quantity: 0, purchaseAmount: 0, paymentMethod: "TUNAI", supplier: "", note: "" });
    setMessage(form.purchaseAmount > 0 ? "Stok bertambah dan pengeluaran belanja bahan otomatis masuk Keuangan." : "Stok masuk tersimpan dan stok bahan diperbarui.");
    reload();
    reloadIngredients();
  }

  return (
    <>
      <Title title="Tambah Stok" subtitle="Catat bahan yang baru dibeli atau masuk ke toko." />
      <HelpNote items={["Gunakan halaman ini setiap ada bahan masuk agar stok sistem bertambah.", "Isi nominal belanja jika bahan dibeli dengan uang toko. Sistem otomatis mencatatnya sebagai Pengeluaran Belanja Bahan di Keuangan."]} />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="grid h-fit gap-3">
          <Field label="Bahan"><Select disabled={!canEdit} value={form.ingredientId} onChange={(event) => setForm({ ...form, ingredientId: event.target.value })}>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</Select></Field>
          <Field label="Jumlah Masuk"><Input disabled={!canEdit} type="number" min={0} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} /></Field>
          <Field label="Nominal Belanja"><Input disabled={!canEdit} type="number" min={0} value={form.purchaseAmount} onChange={(event) => setForm({ ...form, purchaseAmount: Number(event.target.value) })} /></Field>
          <Field label="Metode Bayar"><Select disabled={!canEdit || !form.purchaseAmount} value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option value="TUNAI">Tunai</option><option value="QRIS">QRIS</option><option value="TRANSFER">Transfer</option></Select></Field>
          <Field label="Supplier"><Input disabled={!canEdit} value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} /></Field>
          <Field label="Catatan"><Textarea disabled={!canEdit} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
          <Button disabled={!canEdit || !form.quantity || !ingredients.length} onClick={save}>Simpan Tambah Stok</Button>
          {!canEdit && <div className="rounded-md bg-guava/10 px-3 py-2 text-sm font-semibold text-guava">Stok masuk hanya boleh dicatat oleh Owner.</div>}
          {message && <div className="rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
        </Card>
        <Card>
          <div className="mb-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari bahan atau supplier..." />
          </div>
          <SimpleTable headers={["Tanggal", "Bahan", "Jumlah", "Sebelum", "Sesudah", "Belanja"]} rows={purchasePages.rows.map((item) => [new Date(item.createdAt).toLocaleString("id-ID"), item.ingredientName, `${numberId(item.quantity)} ${item.unit}`, numberId(item.stockBefore), numberId(item.stockAfter), item.purchaseAmount > 0 ? `${rupiah(item.purchaseAmount)} (${item.paymentMethod})` : "-"])} empty="Belum ada stok masuk." />
          <PaginationControls {...purchasePages} />
        </Card>
      </div>
    </>
  );
}
