"use client";

import { useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { ListFilters, PaginationControls, useConfirmDialog, usePagination } from "@/components/shared-state";
import { SimpleTable } from "@/components/tables";
import { Button, Card, Field, Input, SecondaryButton, Select, Textarea } from "@/components/ui";
import { DiffBadge, HelpNote, Metric, StatusBadge, Title, actionLinkClass, actionLinkSmallClass, dangerButtonClass, dangerButtonSmallClass, labelDiff } from "@/components/common/page-primitives";
import { numberId } from "@/utils/format";
import type { User } from "@/types/app-ui";

export function StockOpnameView({ user }: { user: User }) {
  const { data: opnames, reload } = useData<any[]>("/api/stock-opnames", []);
  const [detail, setDetail] = useState<any | null>(null);
  const [form, setForm] = useState(() => {
    const date = new Date();
    return { periodMonth: date.getMonth() + 1, periodYear: date.getFullYear(), opnameDate: date.toISOString().slice(0, 10), generalNotes: "" };
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("ALL");
  const [message, setMessage] = useState("");
  const { confirm, dialog } = useConfirmDialog();

  async function loadDetail(id: string) {
    const row = await api<any>(`/api/stock-opnames?id=${id}`);
    setDetail(row);
    setMessage("");
  }

  async function create() {
    setMessage("");
    const created = await api<any>("/api/stock-opnames", { method: "POST", body: JSON.stringify({ action: "create", ...form, officerId: user.id, officerName: user.name }) });
    setDetail(created);
    setMessage("Draft cek stok dibuat. Isi stok fisik lalu simpan draft atau finalisasi.");
    reload();
  }

  function updateItem(itemId: string, patch: Record<string, unknown>) {
    setDetail((current: any) => current ? { ...current, items: current.items.map((item: any) => item.id === itemId ? computeOpnameItem({ ...item, ...patch }) : item) } : current);
  }

  async function saveDraft() {
    if (!detail) return;
    setMessage("");
    const saved = await api<any>("/api/stock-opnames", { method: "POST", body: JSON.stringify({ action: "saveDraft", id: detail.id, generalNotes: detail.generalNotes ?? "", items: detail.items.map(toOpnamePayload) }) });
    setDetail(saved);
    setMessage("Draft cek stok tersimpan.");
    reload();
  }

  async function finalize() {
    if (!detail) return;
    setMessage("");
    const saved = await api<any>("/api/stock-opnames", { method: "POST", body: JSON.stringify({ action: "finalize", id: detail.id, generalNotes: detail.generalNotes ?? "", items: detail.items.map(toOpnamePayload) }) });
    setDetail(saved);
    setMessage("Cek stok selesai.");
    reload();
  }

  async function deleteOpname(opname: any) {
    const confirmed = await confirm({ title: "Hapus Draft Cek Stok", message: `Hapus draft ${opname.soNumber}? Data input stok fisik pada draft ini akan hilang.`, confirmLabel: "Hapus Draft", tone: "danger" });
    if (!confirmed) return;
    setMessage("");
    await api("/api/stock-opnames", { method: "DELETE", body: JSON.stringify({ id: opname.id }) });
    if (detail?.id === opname.id) setDetail(null);
    setMessage(`Draft ${opname.soNumber} dihapus.`);
    reload();
  }

  const rowsForCsv = detail?.items ?? [];
  const csv = ["Nama bahan,Satuan,Stok sistem,Stok fisik,Selisih,Status selisih,Catatan", ...rowsForCsv.map((item: any) => `${item.ingredientName},${item.unit},${item.systemStock},${item.physicalStock ?? ""},${item.difference ?? ""},${labelDiff(item.differenceType)},${item.notes ?? ""}`)].join("\n");
  const visibleItems = (detail?.items ?? []).filter((item: any) => item.ingredientName.toLowerCase().includes(search.toLowerCase()) && (filter === "ALL" || item.differenceType === filter));
  const filteredOpnames = useMemo(() => opnames.filter((opname) => {
    const keyword = historySearch.trim().toLowerCase();
    const matchesSearch = !keyword || opname.soNumber.toLowerCase().includes(keyword) || opname.officerName.toLowerCase().includes(keyword) || opname.period.toLowerCase().includes(keyword);
    const matchesStatus = historyStatus === "ALL" || opname.status === historyStatus;
    return matchesSearch && matchesStatus;
  }), [opnames, historySearch, historyStatus]);
  const opnamePages = usePagination(filteredOpnames);

  return (
    <>
      {dialog}
      <Title title="Cek Stok Fisik" subtitle="Cocokkan stok di sistem dengan stok nyata di toko." />
      <HelpNote items={["Buat cek stok baru, isi stok fisik yang benar-benar ada, lalu simpan draft.", "Finalisasi hanya jika sudah yakin, karena stok sistem akan disesuaikan mengikuti stok fisik."]} />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="grid h-fit gap-3">
          <h2 className="font-bold">Buat Cek Stok Baru</h2>
          <Field label="Periode Bulan">
            <Select value={form.periodMonth} onChange={(event) => setForm({ ...form, periodMonth: Number(event.target.value) })}>
              {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2026, index, 1).toLocaleString("id-ID", { month: "long" })}</option>)}
            </Select>
          </Field>
          <Field label="Periode Tahun"><Input type="number" value={form.periodYear} onChange={(event) => setForm({ ...form, periodYear: Number(event.target.value) })} /></Field>
          <Field label="Tanggal SO"><Input type="date" value={form.opnameDate} onChange={(event) => setForm({ ...form, opnameDate: event.target.value })} /></Field>
          <Field label="Catatan Umum"><Textarea value={form.generalNotes} onChange={(event) => setForm({ ...form, generalNotes: event.target.value })} /></Field>
          <Button onClick={create}>Buat Cek Stok</Button>
          {message && <div className="rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
        </Card>
        <div className="grid gap-4">
          <Card>
            <h2 className="mb-3 font-bold">Riwayat Cek Stok</h2>
            <ListFilters>
              <Input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Cari nomor SO, periode, petugas..." />
              <Select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}>
                <option value="ALL">Semua status</option>
                <option value="DRAFT">Draft</option>
                <option value="SELESAI">Selesai</option>
              </Select>
              <div />
            </ListFilters>
            <SimpleTable
              headers={["Nomor SO", "Periode", "Tanggal", "Petugas", "Item", "Minus", "Plus", "Status", "Aksi"]}
              rows={opnamePages.rows.map((opname) => [
                opname.soNumber,
                opname.period,
                new Date(opname.opnameDate).toLocaleDateString("id-ID"),
                opname.officerName,
                opname.totalItems,
                numberId(opname.totalMinusDifference),
                numberId(opname.totalPlusDifference),
                <StatusBadge key="status" label={opname.statusLabel} tone={opname.status === "SELESAI" ? "ok" : "warn"} />,
                <div key="actions" className="flex flex-wrap gap-2">
                  <SecondaryButton onClick={() => loadDetail(opname.id)} className="h-9 px-3">{opname.status === "DRAFT" ? "Edit Draft" : "Detail"}</SecondaryButton>
                  {opname.status === "DRAFT" && user.role !== "KASIR" && <button onClick={() => deleteOpname(opname)} className={dangerButtonSmallClass}>Hapus</button>}
                  <a className={actionLinkSmallClass} href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`stock-opname-${opname.soNumber}.csv`}>Export</a>
                </div>
              ])}
              empty="Belum ada cek stok."
            />
            <PaginationControls {...opnamePages} />
          </Card>
          {detail && (
            <Card className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{detail.soNumber}</h2>
                  <div className="text-sm text-ink/60">Periode {detail.period} - Petugas {detail.officerName}</div>
                </div>
                <StatusBadge label={detail.statusLabel} tone={detail.status === "SELESAI" ? "ok" : "warn"} />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <Metric label="Total Item" value={detail.totalItems} />
                <Metric label="Selisih Plus" value={numberId(detail.totalPlusDifference)} />
                <Metric label="Selisih Minus" value={numberId(detail.totalMinusDifference)} />
                <Metric label="Tanggal SO" value={new Date(detail.opnameDate).toLocaleDateString("id-ID")} />
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <Input placeholder="Cari bahan..." value={search} onChange={(event) => setSearch(event.target.value)} />
                <Select value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="ALL">Semua status</option>
                  <option value="SESUAI">Sesuai</option>
                  <option value="LEBIH">Lebih</option>
                  <option value="KURANG">Kurang</option>
                  <option value="BELUM">Belum diisi</option>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] border-collapse text-sm">
                  <thead><tr className="border-b border-black/10 text-left text-ink/55">{["Bahan", "Satuan", "Stok Sistem", "Stok Fisik", "Selisih", "Status", "Catatan"].map((header) => <th key={header} className="px-2 py-2">{header}</th>)}</tr></thead>
                  <tbody>
                    {visibleItems.map((item: any) => (
                      <tr key={item.id} className="border-b border-black/5">
                        <td className="px-2 py-2 font-semibold">{item.ingredientName}</td>
                        <td className="px-2 py-2">{item.unit}</td>
                        <td className="px-2 py-2">{numberId(item.systemStock)}</td>
                        <td className="px-2 py-2"><Input disabled={detail.status === "SELESAI"} type="number" min={0} value={item.physicalStock ?? ""} onChange={(event) => updateItem(item.id, { physicalStock: event.target.value === "" ? null : Number(event.target.value) })} /></td>
                        <td className="px-2 py-2 font-bold">{item.difference == null ? "-" : numberId(item.difference)}</td>
                        <td className="px-2 py-2"><DiffBadge type={item.differenceType} /></td>
                        <td className="px-2 py-2"><Input disabled={detail.status === "SELESAI"} value={item.notes ?? ""} onChange={(event) => updateItem(item.id, { notes: event.target.value })} placeholder={item.difference ? "Wajib diisi" : ""} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Field label="Catatan Umum"><Textarea disabled={detail.status === "SELESAI"} value={detail.generalNotes ?? ""} onChange={(event) => setDetail({ ...detail, generalNotes: event.target.value })} /></Field>
              <div className="flex flex-wrap gap-2">
                {detail.status === "DRAFT" && <SecondaryButton onClick={saveDraft}><Save size={16} /> Simpan Draft</SecondaryButton>}
                {detail.status === "DRAFT" && user.role !== "KASIR" && <Button onClick={finalize}>Finalisasi</Button>}
                {detail.status === "DRAFT" && user.role !== "KASIR" && <button onClick={() => deleteOpname(detail)} className={dangerButtonClass}><Trash2 size={16} /> Hapus Draft</button>}
                <a className={actionLinkClass} href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`stock-opname-${detail.soNumber}.csv`}>Export CSV</a>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function computeOpnameItem(item: any) {
  const physical = item.physicalStock === "" || item.physicalStock == null ? null : Number(item.physicalStock);
  const difference = physical == null ? null : physical - Number(item.systemStock);
  return { ...item, physicalStock: physical, difference, differenceType: difference == null ? "BELUM" : difference === 0 ? "SESUAI" : difference > 0 ? "LEBIH" : "KURANG" };
}

function toOpnamePayload(item: any) {
  return { id: item.id, physicalStock: item.physicalStock, notes: item.notes ?? "" };
}
