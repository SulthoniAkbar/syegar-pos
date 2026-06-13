"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { ListFilters, PaginationControls, useConfirmDialog, usePagination } from "@/components/shared-state";
import { Button, Card, Field, Input, SecondaryButton, Select } from "@/components/ui";
import { HelpNote, Title, dangerButtonClass } from "@/components/common/page-primitives";
import { numberId } from "@/utils/format";
import type { Ingredient } from "@/types/app-ui";

export function IngredientsView() {
  const { data, reload } = useData<Ingredient[]>("/api/ingredients", []);
  const [form, setForm] = useState({ name: "", unit: "gram", currentStock: 0, minimumStock: 0, active: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const { confirm, dialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const filteredIngredients = useMemo(() => data.filter((ingredient) => {
    const keyword = search.trim().toLowerCase();
    const isLow = ingredient.currentStock <= ingredient.minimumStock;
    const matchesSearch = !keyword || ingredient.name.toLowerCase().includes(keyword) || ingredient.unit.toLowerCase().includes(keyword);
    const matchesStock = stockFilter === "ALL" || (stockFilter === "LOW" ? isLow : !isLow);
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? ingredient.active : !ingredient.active);
    return matchesSearch && matchesStock && matchesStatus;
  }), [data, search, stockFilter, statusFilter]);
  const ingredientPages = usePagination(filteredIngredients);

  function reset() {
    setEditingId(null);
    setForm({ name: "", unit: "gram", currentStock: 0, minimumStock: 0, active: true });
  }
  async function save() {
    setMessage("");
    if (editingId) {
      await api("/api/ingredients", { method: "PUT", body: JSON.stringify({ id: editingId, ...form }) });
      setMessage("Bahan baku diperbarui.");
    } else {
      await api("/api/ingredients", { method: "POST", body: JSON.stringify(form) });
      setMessage("Bahan baku ditambahkan.");
    }
    reset();
    reload();
  }
  async function remove(ingredient: Ingredient) {
    const confirmed = await confirm({
      title: "Hapus Bahan",
      message: `Hapus bahan ${ingredient.name}? Bahan yang dihapus tidak bisa dipilih lagi untuk resep baru.`,
      confirmLabel: "Hapus Bahan",
      tone: "danger"
    });
    if (!confirmed) return;
    await api("/api/ingredients", { method: "DELETE", body: JSON.stringify({ id: ingredient.id }) });
    if (editingId === ingredient.id) reset();
    setMessage(`Bahan ${ingredient.name} dihapus.`);
    reload();
  }
  return (
    <>
      {dialog}
      <Title title="Bahan" subtitle="Kelola bahan yang dipakai untuk membuat menu." />
      <HelpNote items={["Isi stok saat ini dan batas minimum agar sistem bisa memberi peringatan stok menipis.", "Bahan aktif bisa dipakai di Resep Stok dan stoknya berkurang otomatis saat transaksi."]} />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="grid h-fit gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">{editingId ? "Edit Bahan" : "Tambah Bahan"}</h2>
            {editingId && <SecondaryButton onClick={reset} className="h-9 px-3"><X size={16} /> Batal</SecondaryButton>}
          </div>
          <Field label="Nama"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Satuan"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
          <Field label="Stok"><Input type="number" min={0} value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} /></Field>
          <Field label="Minimum"><Input type="number" min={0} value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })} /></Field>
          <Field label="Status"><Select value={form.active ? "active" : "inactive"} onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></Select></Field>
          <Button disabled={!form.name || !form.unit} onClick={save}>{editingId ? <Save size={16} /> : <Plus size={16} />} {editingId ? "Simpan Perubahan" : "Tambah"}</Button>
          {message && <div className="rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
        </Card>
        <Card>
          <ListFilters>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari bahan atau satuan..." />
            <Select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
              <option value="ALL">Semua stok</option>
              <option value="LOW">Hampir habis</option>
              <option value="SAFE">Aman</option>
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Semua status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>
          </ListFilters>
          <div className="grid gap-3">
            {ingredientPages.rows.map((ingredient) => (
              <div key={ingredient.id} className="grid gap-3 rounded-md border border-black/10 bg-white p-3 md:grid-cols-[1fr_220px] md:items-center">
                <div>
                  <div className="font-bold">{ingredient.name}</div>
                  <div className="text-sm text-ink/60">{numberId(ingredient.currentStock)} {ingredient.unit} - Min {numberId(ingredient.minimumStock)} - {ingredient.active ? "Aktif" : "Nonaktif"} - {ingredient.currentStock <= ingredient.minimumStock ? "Hampir habis" : "Aman"}</div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <SecondaryButton onClick={() => { setEditingId(ingredient.id); setForm({ name: ingredient.name, unit: ingredient.unit, currentStock: ingredient.currentStock, minimumStock: ingredient.minimumStock, active: ingredient.active }); setMessage(""); }}><Pencil size={16} /> Edit</SecondaryButton>
                  <button onClick={() => remove(ingredient)} className={dangerButtonClass}><Trash2 size={16} /> Hapus</button>
                </div>
              </div>
            ))}
            {!ingredientPages.rows.length && <div className="rounded-md border border-dashed border-black/15 p-4 text-center text-sm text-ink/50">Tidak ada bahan yang cocok.</div>}
          </div>
          <PaginationControls {...ingredientPages} />
        </Card>
      </div>
    </>
  );
}