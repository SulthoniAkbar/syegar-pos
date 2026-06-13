"use client";

import { useMemo, useState } from "react";
import { ImagePlus, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { ListFilters, PaginationControls, useConfirmDialog, usePagination } from "@/components/shared-state";
import { Button, Card, Field, Input, SecondaryButton, Select } from "@/components/ui";
import { HelpNote, Title, actionLinkClass, dangerButtonClass } from "@/components/common/page-primitives";
import { MenuPhoto } from "@/components/common/menu-photo";
import { rupiah } from "@/utils/format";
import type { Category, Menu } from "@/types/app-ui";

export function MenusView() {
  const { data, reload } = useData<Menu[]>("/api/menus", []);
  const { data: categories } = useData<Category[]>("/api/categories", []);
  const [form, setForm] = useState({ name: "", price: 0, categoryId: "", active: true, photoUrl: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const { confirm, dialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const filteredMenus = useMemo(() => data.filter((menu) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch = !keyword || menu.name.toLowerCase().includes(keyword) || (menu.category?.name ?? "").toLowerCase().includes(keyword);
    const matchesCategory = categoryFilter === "ALL" || menu.categoryId === categoryFilter;
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? menu.active : !menu.active);
    return matchesSearch && matchesCategory && matchesStatus;
  }), [data, search, categoryFilter, statusFilter]);
  const menuPages = usePagination(filteredMenus);

  async function upload(file: File) {
    const body = new FormData();
    body.append("file", file);
    const result = await api<{ url: string }>("/api/uploads", { method: "POST", body });
    return result.url;
  }

  async function save() {
    setMessage("");
    const payload = { ...form, categoryId: form.categoryId || categories[0]?.id, photoUrl: form.photoUrl || null };
    if (editingId) {
      await api("/api/menus", { method: "PUT", body: JSON.stringify({ id: editingId, ...payload }) });
      setMessage("Perubahan menu tersimpan.");
    } else {
      await api("/api/menus", { method: "POST", body: JSON.stringify(payload) });
      setMessage("Menu tersimpan.");
    }
    resetForm();
    reload();
  }

  function startEdit(menu: Menu) {
    setEditingId(menu.id);
    setForm({
      name: menu.name,
      price: menu.price,
      categoryId: menu.categoryId,
      active: menu.active,
      photoUrl: menu.photoUrl ?? ""
    });
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", price: 0, categoryId: "", active: true, photoUrl: "" });
  }

  async function deleteMenu(menu: Menu) {
    const confirmed = await confirm({
      title: "Hapus Menu",
      message: `Hapus menu ${menu.name}? Menu yang dihapus tidak akan muncul untuk transaksi baru.`,
      confirmLabel: "Hapus Menu",
      tone: "danger"
    });
    if (!confirmed) return;
    await api("/api/menus", { method: "DELETE", body: JSON.stringify({ id: menu.id }) });
    if (editingId === menu.id) resetForm();
    setMessage(`Menu ${menu.name} dihapus.`);
    reload();
  }

  async function replaceImage(menu: Menu, file: File) {
    setMessage("");
    const photoUrl = await upload(file);
    await api("/api/menus", {
      method: "PUT",
      body: JSON.stringify({
        id: menu.id,
        name: menu.name,
        price: menu.price,
        categoryId: menu.categoryId,
        active: menu.active,
        photoUrl
      })
    });
    setMessage(`Gambar ${menu.name} diperbarui.`);
    reload();
  }

  return (
    <>
      {dialog}
      <Title title="Menu Jualan" subtitle="Tambah dan edit menu yang tampil di kasir." />
      <HelpNote items={["Menu aktif akan muncul di halaman Kasir.", "Jika menu memakai stok bahan, lengkapi resepnya agar stok otomatis berkurang saat terjual."]} />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="grid h-fit gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">{editingId ? "Edit Menu" : "Tambah Menu"}</h2>
            {editingId && <SecondaryButton onClick={resetForm} className="h-9 px-3"><X size={16} /> Batal</SecondaryButton>}
          </div>
          <Field label="Nama Menu">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Harga">
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </Field>
          <Field label="Kategori">
            <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.active ? "active" : "inactive"} onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </Select>
          </Field>
          <Field label="Gambar Menu">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="block w-full text-sm file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-leaf file:px-4 file:text-sm file:font-semibold file:text-white"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setForm({ ...form, photoUrl: await upload(file) });
              }}
            />
          </Field>
          {form.photoUrl && <MenuPhoto menu={{ name: form.name || "Preview", photoUrl: form.photoUrl }} className="h-36 w-full rounded-md" />}
          <Button onClick={save} disabled={!form.name || !form.price || !categories.length}>
            {editingId ? <Save size={16} /> : <Plus size={16} />} {editingId ? "Simpan Perubahan" : "Tambah Menu"}
          </Button>
          {message && <div className="rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
        </Card>
        <Card>
          <ListFilters>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari menu atau kategori..." />
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="ALL">Semua kategori</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Semua status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>
          </ListFilters>
          <div className="grid gap-3">
            {menuPages.rows.map((menu) => (
              <div key={menu.id} className="grid gap-3 rounded-md border border-black/10 bg-white p-3 md:grid-cols-[120px_1fr_220px] md:items-center">
                <MenuPhoto menu={menu} className="h-20 w-full rounded-md md:w-28" />
                <div>
                  <div className="font-bold">{menu.name}</div>
                  <div className="mt-1 text-sm text-ink/60">{menu.category?.name} - {rupiah(menu.price)} - {menu.active ? "Aktif" : "Nonaktif"}</div>
                  {!menu.recipes?.length && <div className="mt-2 inline-flex rounded-md bg-mango/20 px-2 py-1 text-xs font-bold text-ink/70">Belum ada resep stok</div>}
                </div>
                <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
                  <SecondaryButton onClick={() => startEdit(menu)} className="h-10 px-3"><Pencil size={16} /> Edit</SecondaryButton>
                  <label className={`${actionLinkClass} cursor-pointer px-3`}>
                    <ImagePlus size={16} /> Gambar
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await replaceImage(menu, file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button onClick={() => deleteMenu(menu)} className={`${dangerButtonClass} px-3`}>
                    <Trash2 size={16} /> Hapus
                  </button>
                </div>
              </div>
            ))}
            {!menuPages.rows.length && <div className="rounded-md border border-dashed border-black/15 p-4 text-center text-sm text-ink/50">Tidak ada menu yang cocok.</div>}
          </div>
          <PaginationControls {...menuPages} />
        </Card>
      </div>
    </>
  );
}
