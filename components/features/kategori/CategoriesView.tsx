"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { ListFilters, PaginationControls, useConfirmDialog, usePagination } from "@/components/shared-state";
import { Button, Card, Field, Input, SecondaryButton, Select } from "@/components/ui";
import { Title, dangerButtonClass } from "@/components/common/page-primitives";
import type { Category } from "@/types/app-ui";

export function CategoriesView() {
  const { data, reload } = useData<Category[]>("/api/categories", []);
  const [form, setForm] = useState({ name: "", type: "MINUMAN", active: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const { confirm, dialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const filteredCategories = useMemo(() => data.filter((category) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch = !keyword || category.name.toLowerCase().includes(keyword);
    const matchesType = typeFilter === "ALL" || category.type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? category.active : !category.active);
    return matchesSearch && matchesType && matchesStatus;
  }), [data, search, typeFilter, statusFilter]);
  const categoryPages = usePagination(filteredCategories);

  function reset() {
    setEditingId(null);
    setForm({ name: "", type: "MINUMAN", active: true });
  }
  async function save() {
    setMessage("");
    if (editingId) {
      await api("/api/categories", { method: "PUT", body: JSON.stringify({ id: editingId, ...form }) });
      setMessage("Kategori diperbarui.");
    } else {
      await api("/api/categories", { method: "POST", body: JSON.stringify(form) });
      setMessage("Kategori ditambahkan.");
    }
    reset();
    reload();
  }
  async function remove(category: Category) {
    const usedCount = category._count?.menus ?? 0;
    const confirmed = await confirm({
      title: "Hapus Kategori",
      message: usedCount > 0 ? `Kategori ${category.name} masih dipakai oleh ${usedCount} menu. Tetap hapus kategori ini?` : `Hapus kategori ${category.name}?`,
      confirmLabel: "Hapus Kategori",
      tone: "danger"
    });
    if (!confirmed) return;
    await api("/api/categories", { method: "DELETE", body: JSON.stringify({ id: category.id }) });
    if (editingId === category.id) reset();
    setMessage(`Kategori ${category.name} dihapus.`);
    reload();
  }
  return (
    <>
      {dialog}
      <Title title="Kategori" subtitle="CRUD kategori menu makanan dan minuman." />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="grid h-fit gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">{editingId ? "Edit Kategori" : "Tambah Kategori"}</h2>
            {editingId && <SecondaryButton onClick={reset} className="h-9 px-3"><X size={16} /> Batal</SecondaryButton>}
          </div>
          <Field label="Nama"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Tipe"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="MINUMAN">Minuman</option><option value="MAKANAN">Makanan</option></Select></Field>
          <Field label="Status"><Select value={form.active ? "active" : "inactive"} onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></Select></Field>
          <Button disabled={!form.name} onClick={save}>{editingId ? <Save size={16} /> : <Plus size={16} />} {editingId ? "Simpan Perubahan" : "Tambah"}</Button>
          {message && <div className="rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
        </Card>
        <Card>
          <ListFilters>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kategori..." />
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="ALL">Semua tipe</option>
              <option value="MINUMAN">Minuman</option>
              <option value="MAKANAN">Makanan</option>
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Semua status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>
          </ListFilters>
          <div className="grid gap-3">
            {categoryPages.rows.map((category) => (
              <div key={category.id} className="grid gap-3 rounded-md border border-black/10 bg-white p-3 md:grid-cols-[1fr_220px] md:items-center">
                <div><div className="font-bold">{category.name}</div><div className="text-sm text-ink/60">{category.type} - {category.active ? "Aktif" : "Nonaktif"} - {category._count?.menus ?? 0} menu</div></div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <SecondaryButton onClick={() => { setEditingId(category.id); setForm({ name: category.name, type: category.type, active: category.active }); setMessage(""); }}><Pencil size={16} /> Edit</SecondaryButton>
                  <button onClick={() => remove(category)} className={dangerButtonClass}><Trash2 size={16} /> Hapus</button>
                </div>
              </div>
            ))}
            {!categoryPages.rows.length && <div className="rounded-md border border-dashed border-black/15 p-4 text-center text-sm text-ink/50">Tidak ada kategori yang cocok.</div>}
          </div>
          <PaginationControls {...categoryPages} />
        </Card>
      </div>
    </>
  );
}