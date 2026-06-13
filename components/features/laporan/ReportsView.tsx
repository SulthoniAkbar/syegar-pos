"use client";

import { useMemo, useState } from "react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { ListFilters, PaginationControls, usePagination, useTextPromptDialog } from "@/components/shared-state";
import { SimpleTable } from "@/components/tables";
import { Card, Field, Input, Select } from "@/components/ui";
import { HelpNote, Title, dangerButtonSmallClass } from "@/components/common/page-primitives";
import { rupiah } from "@/utils/format";

export function ReportsView() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const { data, reload } = useData<any>(`/api/reports?from=${from}&to=${to}`, null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { promptText, dialog } = useTextPromptDialog();
  const filteredTransactions = useMemo(() => {
    const transactions = data?.transactions ?? [];
    const keyword = search.trim().toLowerCase();
    return transactions.filter((transaction: any) => {
      const matchesSearch = !keyword || transaction.receiptNumber.toLowerCase().includes(keyword) || transaction.cashier.name.toLowerCase().includes(keyword);
      const matchesPayment = paymentFilter === "ALL" || transaction.paymentMethod === paymentFilter;
      const matchesStatus = statusFilter === "ALL" || transaction.status === statusFilter;
      return matchesSearch && matchesPayment && matchesStatus;
    });
  }, [data, search, paymentFilter, statusFilter]);
  const transactionPages = usePagination<any>(filteredTransactions, 10);
  const csv = useMemo(() => {
    if (!data) return "";
    return ["Tanggal,Nota,Kasir,Metode,Status,Total", ...filteredTransactions.map((t: any) => `${new Date(t.paidAt).toLocaleString("id-ID")},${t.receiptNumber},${t.cashier.name},${t.paymentMethod},${t.status},${t.total}`)].join("\n");
  }, [data, filteredTransactions]);
  async function voidTransaction(transaction: any) {
    const reason = await promptText({
      title: "Batalkan Transaksi",
      message: `Tulis alasan pembatalan transaksi ${transaction.receiptNumber}. Stok dari transaksi ini akan dikembalikan.`,
      placeholder: "Contoh: salah input menu, pelanggan batal beli...",
      confirmLabel: "Batalkan Transaksi"
    });
    if (!reason) return;
    await api("/api/transactions", { method: "PUT", body: JSON.stringify({ id: transaction.id, reason }) });
    setMessage(`Transaksi ${transaction.receiptNumber} dibatalkan dan stok dikembalikan.`);
    reload();
  }
  if (!data) return <Title title="Laporan" subtitle="Memuat laporan..." />;
  return (
    <>
      {dialog}
      <Title title="Laporan" subtitle="Cari transaksi, export CSV, dan batalkan transaksi jika salah input." />
      <HelpNote items={["Gunakan tanggal dan filter untuk mencari transaksi tertentu.", "Batalkan Transaksi dipakai jika transaksi salah input atau pelanggan batal. Data tetap tersimpan sebagai jejak audit."]} />
      <Card className="mb-4 grid gap-3 md:grid-cols-[180px_180px_1fr] md:items-end">
        <Field label="Dari"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Sampai"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <a className="inline-flex h-10 items-center justify-center rounded-md bg-leaf px-4 text-sm font-bold text-white ring-1 ring-leaf/30 hover:bg-[#24633e]" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="laporan-syegar-pos.csv">Export CSV</a>
      </Card>
      {message && <div className="mb-4 rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
      <Card>
        <ListFilters>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nota atau kasir..." />
          <Select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="ALL">Semua metode</option>
            <option value="TUNAI">Tunai</option>
            <option value="QRIS">QRIS</option>
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">Semua status</option>
            <option value="PAID">PAID</option>
            <option value="VOID">VOID</option>
          </Select>
        </ListFilters>
        <SimpleTable headers={["Tanggal", "Nota", "Kasir", "Metode", "Status", "Total", "Aksi"]} rows={transactionPages.rows.map((x: any) => [new Date(x.paidAt).toLocaleString("id-ID"), x.receiptNumber, x.cashier.name, x.paymentMethod, x.status === "VOID" ? "Batal" : x.status, rupiah(x.total), x.status === "PAID" ? <button key={x.id} onClick={() => voidTransaction(x)} className={dangerButtonSmallClass}>Batalkan</button> : "-"])} empty="Tidak ada transaksi pada rentang/filter ini." />
        <PaginationControls {...transactionPages} />
      </Card>
    </>
  );
}