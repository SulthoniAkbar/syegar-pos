"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { ListFilters, PaginationControls, useConfirmDialog, usePagination } from "@/components/shared-state";
import { Button, Card, Field, Input, SecondaryButton, Select } from "@/components/ui";
import { HelpNote, Title, dangerButtonClass } from "@/components/common/page-primitives";
import { rupiah } from "@/utils/format";
import type { MenuOption, OptionGroup } from "@/types/app-ui";

export function OptionsView() {
  const { data, reload } = useData<OptionGroup[]>("/api/options", []);
  const groups = data;
  const [form, setForm] = useState({ name: "", extraPrice: 0, optionGroupId: "", active: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const { confirm, dialog } = useConfirmDialog();
  const optionRows = groups.flatMap((group) => group.options.map((option) => ({ ...option, groupName: group.name })));
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const filteredOptions = useMemo(() => optionRows.filter((option) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch = !keyword || option.name.toLowerCase().includes(keyword) || option.groupName.toLowerCase().includes(keyword);
    const matchesGroup = groupFilter === "ALL" || option.optionGroupId === groupFilter;
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? option.active : !option.active);
    return matchesSearch && matchesGroup && matchesStatus;
  }), [optionRows, search, groupFilter, statusFilter]);
  const optionPages = usePagination(filteredOptions);

  function reset() {
    setEditingId(null);
    setForm({ name: "", extraPrice: 0, optionGroupId: "", active: true });
  }
  async function save() {
    setMessage("");
    const payload = { ...form, optionGroupId: form.optionGroupId || groups[0]?.id };
    if (editingId) {
      await api("/api/options", { method: "PUT", body: JSON.stringify({ id: editingId, ...payload }) });
      setMessage("Varian/topping diperbarui.");
    } else {
      await api("/api/options", { method: "POST", body: JSON.stringify(payload) });
      setMessage("Varian/topping ditambahkan.");
    }
    reset();
    reload();
  }
  async function remove(option: MenuOption & { groupName: string }) {
    const confirmed = await confirm({
      title: "Hapus Varian/Topping",
      message: `Hapus opsi ${option.name} dari grup ${option.groupName}?`,
      confirmLabel: "Hapus Opsi",
      tone: "danger"
    });
    if (!confirmed) return;
    await api("/api/options", { method: "DELETE", body: JSON.stringify({ id: option.id }) });
    if (editingId === option.id) reset();
    setMessage(`Opsi ${option.name} dihapus.`);
    reload();
  }
  return (
    <>
      {dialog}
      <Title title="Pilihan Tambahan" subtitle="Kelola ukuran, level gula, dan topping." />
      <HelpNote items={["Pilihan tambahan bisa menaikkan harga transaksi, misalnya Large atau topping Keju.", "Nonaktifkan pilihan yang sedang tidak tersedia agar tidak dipilih kasir."]} />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="grid h-fit gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">{editingId ? "Edit Opsi" : "Tambah Opsi"}</h2>
            {editingId && <SecondaryButton onClick={reset} className="h-9 px-3"><X size={16} /> Batal</SecondaryButton>}
          </div>
          <Field label="Nama Opsi"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Grup"><Select value={form.optionGroupId} onChange={(e) => setForm({ ...form, optionGroupId: e.target.value })}>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>
          <Field label="Tambahan Harga"><Input type="number" min={0} value={form.extraPrice} onChange={(e) => setForm({ ...form, extraPrice: Number(e.target.value) })} /></Field>
          <Field label="Status"><Select value={form.active ? "active" : "inactive"} onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></Select></Field>
          <Button disabled={!form.name || !groups.length} onClick={save}>{editingId ? <Save size={16} /> : <Plus size={16} />} {editingId ? "Simpan Perubahan" : "Tambah"}</Button>
          {message && <div className="rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
        </Card>
        <Card>
          <ListFilters>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari opsi atau grup..." />
            <Select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
              <option value="ALL">Semua grup</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Semua status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>
          </ListFilters>
          <div className="grid gap-3">
            {optionPages.rows.map((option) => (
              <div key={option.id} className="grid gap-3 rounded-md border border-black/10 bg-white p-3 md:grid-cols-[1fr_220px] md:items-center">
                <div><div className="font-bold">{option.name}</div><div className="text-sm text-ink/60">{option.groupName} - {rupiah(option.extraPrice)} - {option.active ? "Aktif" : "Nonaktif"}</div></div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <SecondaryButton onClick={() => { setEditingId(option.id); setForm({ name: option.name, extraPrice: option.extraPrice, optionGroupId: option.optionGroupId, active: option.active }); setMessage(""); }}><Pencil size={16} /> Edit</SecondaryButton>
                  <button onClick={() => remove(option)} className={dangerButtonClass}><Trash2 size={16} /> Hapus</button>
                </div>
              </div>
            ))}
            {!optionPages.rows.length && <div className="rounded-md border border-dashed border-black/15 p-4 text-center text-sm text-ink/50">Tidak ada opsi yang cocok.</div>}
          </div>
          <PaginationControls {...optionPages} />
        </Card>
      </div>
    </>
  );
}