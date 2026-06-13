"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Save, UserX, X } from "lucide-react";
import { api } from "@/components/api";
import { ListFilters, PaginationControls, useConfirmDialog, usePagination } from "@/components/shared-state";
import { Button, Card, Field, Input, SecondaryButton, Select } from "@/components/ui";
import { Title, dangerButtonClass } from "@/components/common/page-primitives";
import { useData } from "@/hooks/useData";
import type { User } from "@/types/app-ui";

type ManagedUser = {
  id: string;
  name: string;
  username: string;
  role: "SUPER_ADMIN" | "OWNER" | "KASIR";
  active: boolean;
  createdAt: string;
};

const emptyForm = { name: "", username: "", password: "", role: "KASIR" as ManagedUser["role"], active: true };

export function UsersView({ currentUser }: { currentUser: User }) {
  const { data, reload } = useData<ManagedUser[]>("/api/users", []);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { confirm, dialog } = useConfirmDialog();
  const filteredUsers = useMemo(() => data.filter((user) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch = !keyword || user.name.toLowerCase().includes(keyword) || user.username.toLowerCase().includes(keyword);
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? user.active : !user.active);
    return matchesSearch && matchesRole && matchesStatus;
  }), [data, roleFilter, search, statusFilter]);
  const userPages = usePagination(filteredUsers);

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save() {
    setMessage("");
    if (editingId) {
      await api("/api/users", { method: "PUT", body: JSON.stringify({ id: editingId, ...form, password: form.password || undefined }) });
      setMessage("User diperbarui.");
    } else {
      await api("/api/users", { method: "POST", body: JSON.stringify(form) });
      setMessage("User ditambahkan.");
    }
    reset();
    reload();
  }

  async function deactivate(user: ManagedUser) {
    const confirmed = await confirm({
      title: "Nonaktifkan User",
      message: `Nonaktifkan akun ${user.name}? User ini tidak bisa login sampai diaktifkan kembali.`,
      confirmLabel: "Nonaktifkan",
      tone: "danger"
    });
    if (!confirmed) return;
    await api("/api/users", { method: "DELETE", body: JSON.stringify({ id: user.id }) });
    if (editingId === user.id) reset();
    setMessage(`User ${user.name} dinonaktifkan.`);
    reload();
  }

  if (currentUser.role !== "SUPER_ADMIN") {
    return <Title title="Pengguna" subtitle="Halaman ini hanya bisa diakses oleh Super Admin." />;
  }

  return (
    <>
      {dialog}
      <Title title="Pengguna" subtitle="Tambah akun kasir, owner, dan super admin." />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card className="grid h-fit gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">{editingId ? "Edit User" : "Tambah User"}</h2>
            {editingId && <SecondaryButton onClick={reset} className="h-9 px-3"><X size={16} /> Batal</SecondaryButton>}
          </div>
          <Field label="Nama"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Username"><Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></Field>
          <Field label={editingId ? "Password Baru" : "Password"}>
            <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editingId ? "Kosongkan jika tidak diganti" : ""} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as ManagedUser["role"] })}>
              <option value="KASIR">Kasir</option>
              <option value="OWNER">Owner</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.active ? "active" : "inactive"} onChange={(event) => setForm({ ...form, active: event.target.value === "active" })}>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </Select>
          </Field>
          <Button disabled={!form.name || !form.username || (!editingId && form.password.length < 6)} onClick={save}>
            {editingId ? <Save size={16} /> : <Plus size={16} />} {editingId ? "Simpan Perubahan" : "Tambah User"}
          </Button>
          {message && <div className="rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
        </Card>
        <Card>
          <ListFilters>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama/username..." />
            <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="ALL">Semua role</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="OWNER">Owner</option>
              <option value="KASIR">Kasir</option>
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Semua status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>
          </ListFilters>
          <div className="grid gap-3">
            {userPages.rows.map((user) => (
              <div key={user.id} className="grid gap-3 rounded-md border border-black/10 bg-white p-3 lg:grid-cols-[1fr_260px] lg:items-center">
                <div>
                  <div className="font-bold">{user.name}</div>
                  <div className="text-sm text-ink/60">{user.username} - {roleLabel(user.role)} - {user.active ? "Aktif" : "Nonaktif"}</div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <SecondaryButton onClick={() => { setEditingId(user.id); setForm({ name: user.name, username: user.username, password: "", role: user.role, active: user.active }); setMessage(""); }}><Pencil size={16} /> Edit</SecondaryButton>
                  <button disabled={!user.active || user.id === currentUser.id} onClick={() => deactivate(user)} className={`${dangerButtonClass} disabled:cursor-not-allowed disabled:bg-ink/20 disabled:ring-transparent`}><UserX size={16} /> Nonaktif</button>
                </div>
              </div>
            ))}
            {!userPages.rows.length && <div className="rounded-md border border-dashed border-black/15 p-4 text-center text-sm text-ink/50">Tidak ada user yang cocok.</div>}
          </div>
          <PaginationControls {...userPages} />
        </Card>
      </div>
    </>
  );
}

function roleLabel(role: ManagedUser["role"]) {
  return role === "SUPER_ADMIN" ? "Super Admin" : role === "OWNER" ? "Owner" : "Kasir";
}
