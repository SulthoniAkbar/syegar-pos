"use client";

import { useState } from "react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { PaginationControls, usePagination } from "@/components/shared-state";
import { SimpleTable } from "@/components/tables";
import { Button, Card, Field, Input, SecondaryButton, Textarea } from "@/components/ui";
import { HelpNote, Metric, Rows, Title, actionLinkClass } from "@/components/common/page-primitives";
import { numberId, rupiah } from "@/utils/format";
import type { User } from "@/types/app-ui";

export function ShiftView({ user }: { user: User }) {
  const { data, reload } = useData<any>("/api/shifts", null);
  const [openingCash, setOpeningCash] = useState(0);
  const [closingCashActual, setClosingCashActual] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const summary = data?.summary;
  const activeShift = data?.activeShift;
  const expectedCash = summary?.expectedCash ?? 0;
  const actualNumber = closingCashActual === "" ? null : Number(closingCashActual);
  const cashDifference = actualNumber == null ? null : actualNumber - expectedCash;
  const soldMenuPages = usePagination<any>(summary?.items ?? [], 5);
  const usedIngredientPages = usePagination<any>(summary?.ingredients ?? [], 5);
  const shiftHistoryPages = usePagination<any>(data?.history ?? [], 5);
  const csv = summary ? ["Jenis,Nama,Jumlah,Total/Satuan,Stok Sisa", ...summary.items.map((item: any) => `Menu,${item.menuName},${item.quantitySold},${item.totalSales},`), ...summary.ingredients.map((item: any) => `Bahan,${item.ingredientName},${item.quantityUsed},${item.unit},${item.remainingStock}`)].join("\n") : "";

  async function openShift() {
    setMessage("");
    await api("/api/shifts", { method: "POST", body: JSON.stringify({ action: "open", cashierId: user.id, openingCash }) });
    setMessage("Shift aktif dibuka.");
    reload();
  }

  async function closeShift() {
    setMessage("");
    await api<any>("/api/shifts", { method: "POST", body: JSON.stringify({ action: "close", closingCashActual: actualNumber, notes }) });
    setMessage("Kasir berhasil ditutup.");
    setClosingCashActual("");
    setNotes("");
    reload();
  }

  if (!data) return <Title title="Tutup Kasir" subtitle="Memuat data kasir..." />;

  return (
    <>
      <Title title="Tutup Kasir" subtitle="Cocokkan transaksi, pembayaran, dan uang laci sebelum selesai kerja." />
      <HelpNote items={["Buka shift sebelum mulai jualan, lalu semua transaksi akan masuk ke shift aktif.", "Saat selesai, isi uang tunai aktual di laci. Sistem menghitung selisih otomatis."]} />
      {!activeShift && (
        <Card className="mb-4 grid gap-3 md:max-w-md">
          <h2 className="font-bold">Mulai Kasir Baru</h2>
          <Field label="Uang Awal Kas/Laci"><Input type="number" min={0} value={openingCash} onChange={(event) => setOpeningCash(Number(event.target.value))} /></Field>
          <Button onClick={openShift}>Mulai Kasir</Button>
        </Card>
      )}
      {summary && (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Status Kasir" value={summary.shift.statusLabel} />
            <Metric label="Kasir" value={summary.shift.cashier?.name ?? user.name} />
            <Metric label="Jam Mulai" value={new Date(summary.shift.openedAt).toLocaleString("id-ID")} />
            <Metric label="Jam Selesai" value={summary.shift.closedAt ? new Date(summary.shift.closedAt).toLocaleString("id-ID") : "-"} />
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <Metric label="Jumlah Transaksi" value={summary.totalTransactions} />
            <Metric label="Item Terjual" value={summary.totalItemsSold} />
            <Metric label="Total Omzet" value={rupiah(summary.totalSales)} />
            <Metric label="Tunai" value={rupiah(summary.totalCashPayment)} />
            <Metric label="QRIS" value={rupiah(summary.totalQrisPayment)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-bold">Metode Pembayaran</h2>
              <Rows rows={[["Tunai", rupiah(summary.totalCashPayment), ""], ["QRIS", rupiah(summary.totalQrisPayment), ""], ["Total Pembayaran", rupiah(summary.totalPayment), ""]]} empty="Belum ada pembayaran." />
            </Card>
            <Card className="grid gap-3">
              <h2 className="font-bold">Rekonsiliasi Kas Tunai</h2>
              <Rows rows={[["Uang awal kas", rupiah(summary.openingCash), ""], ["Tunai menurut sistem", rupiah(summary.totalCashPayment), ""], ["Uang seharusnya", rupiah(expectedCash), ""]]} empty="-" />
              {activeShift && <Field label="Uang Tunai Aktual di Laci"><Input type="number" min={0} value={closingCashActual} onChange={(event) => setClosingCashActual(event.target.value)} /></Field>}
              <div className={`rounded-md px-3 py-2 text-sm font-bold ${cashDifference === 0 ? "bg-lime/30 text-leaf" : cashDifference == null ? "bg-skysoft text-ink/70" : "bg-guava/10 text-guava"}`}>Selisih: {cashDifference == null ? "-" : rupiah(cashDifference)}</div>
            </Card>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card><h2 className="mb-3 font-bold">Menu Terjual Selama Shift</h2><SimpleTable headers={["Menu", "Jumlah", "Total"]} rows={soldMenuPages.rows.map((item: any) => [item.menuName, numberId(item.quantitySold), rupiah(item.totalSales)])} empty="Belum ada menu terjual." /><PaginationControls {...soldMenuPages} /></Card>
            <Card><h2 className="mb-3 font-bold">Bahan Terpakai</h2><SimpleTable headers={["Bahan", "Terpakai", "Stok Sisa"]} rows={usedIngredientPages.rows.map((item: any) => [item.ingredientName, `${numberId(item.quantityUsed)} ${item.unit}`, `${numberId(item.remainingStock)} ${item.unit}`])} empty="Belum ada bahan terpakai." /><PaginationControls {...usedIngredientPages} /></Card>
          </div>
          <Card className="grid gap-3">
            <Field label="Catatan Shift"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!activeShift} /></Field>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton onClick={reload}>Cek Ringkasan</SecondaryButton>
              <a className={actionLinkClass} href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="tutup-shift-syegar-pos.csv">Export CSV</a>
              {activeShift && <Button disabled={actualNumber == null} onClick={closeShift}>Simpan & Tutup Kasir</Button>}
            </div>
            {message && <div className="rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
          </Card>
          <Card><h2 className="mb-3 font-bold">Riwayat Kasir</h2><SimpleTable headers={["Tanggal", "Kasir", "Status", "Omzet", "Selisih"]} rows={shiftHistoryPages.rows.map((item: any) => [new Date(item.openedAt).toLocaleString("id-ID"), item.cashier?.name, item.statusLabel, rupiah(item.totalSales ?? 0), item.cashDifference == null ? "-" : rupiah(item.cashDifference)])} empty="Belum ada riwayat shift." /><PaginationControls {...shiftHistoryPages} /></Card>
        </div>
      )}
    </>
  );
}
