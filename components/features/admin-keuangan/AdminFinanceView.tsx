"use client";

import { useState } from "react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { PaginationControls, useConfirmDialog, usePagination } from "@/components/shared-state";
import { RowActions, SimpleTable } from "@/components/tables";
import { Button, Field, Input, SecondaryButton, Select, Textarea } from "@/components/ui";
import { AdminSection, HelpNote, Metric, Title } from "@/components/common/page-primitives";
import { rupiah } from "@/utils/format";

export function AdminFinanceView() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, reload } = useData<any>("/api/admin-finance", null);
  const { confirm, dialog } = useConfirmDialog();
  const [tab, setTab] = useState("cash");
  const [message, setMessage] = useState("");
  const [cashEditId, setCashEditId] = useState<string | null>(null);
  const [cashForm, setCashForm] = useState({ type: "CASH_IN", category: "", amount: 0, note: "", entryDate: today });
  const [expenseEditId, setExpenseEditId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({ expenseDate: today, category: "", vendor: "", amount: 0, paymentMethod: "TUNAI", note: "" });
  const [payrollForm, setPayrollForm] = useState({ employeeName: "", period: today.slice(0, 7), amount: 0, paymentDate: today, paymentMethod: "TUNAI", note: "" });
  const [debtEditId, setDebtEditId] = useState<string | null>(null);
  const [debtForm, setDebtForm] = useState({ type: "UTANG", partyName: "", amount: 0, paidAmount: 0, dueDate: "", note: "" });
  const [paymentForm, setPaymentForm] = useState({ id: "", paymentAmount: 0, paymentDate: today, paymentNote: "" });
  const [consignmentEditId, setConsignmentEditId] = useState<string | null>(null);
  const [consignmentForm, setConsignmentForm] = useState({ supplierName: "", itemName: "", quantityReceived: 0, quantitySold: 0, sellPrice: 0, supplierPrice: 0, status: "ACTIVE", note: "" });
  const [sellForm, setSellForm] = useState({ id: "", sellQuantity: 1, note: "" });
  const cashPages = usePagination<any>(data?.cash ?? [], 8);
  const expensePages = usePagination<any>(data?.expenses ?? [], 8);
  const payrollPages = usePagination<any>((data?.expenses ?? []).filter((expense: any) => expense.category === "Gaji Karyawan"), 8);
  const debtPages = usePagination<any>(data?.debts ?? [], 8);
  const consignmentPages = usePagination<any>(data?.consignments ?? [], 8);

  async function post(body: Record<string, unknown>, success: string) {
    setMessage("");
    await api("/api/admin-finance", { method: "POST", body: JSON.stringify(body) });
    setMessage(success);
    reload();
  }

  async function deleteRow(action: string, id: string, label: string) {
    const confirmed = await confirm({ title: `Hapus ${label}`, message: `Yakin hapus data ${label.toLowerCase()} ini?`, confirmLabel: "Hapus", tone: "danger" });
    if (!confirmed) return;
    await post({ action, id }, `${label} dihapus.`);
  }

  async function saveCash() {
    await post({ action: cashEditId ? "updateCash" : "createCash", id: cashEditId ?? undefined, ...cashForm }, cashEditId ? "Data kas diperbarui." : "Data kas ditambahkan.");
    setCashEditId(null);
    setCashForm({ type: "CASH_IN", category: "", amount: 0, note: "", entryDate: today });
  }

  async function saveExpense() {
    await post({ action: expenseEditId ? "updateExpense" : "createExpense", id: expenseEditId ?? undefined, ...expenseForm }, expenseEditId ? "Pengeluaran diperbarui." : "Pengeluaran dicatat.");
    setExpenseEditId(null);
    setExpenseForm({ expenseDate: today, category: "", vendor: "", amount: 0, paymentMethod: "TUNAI", note: "" });
  }

  async function savePayroll() {
    await post({
      action: "createExpense",
      expenseDate: payrollForm.paymentDate,
      category: "Gaji Karyawan",
      vendor: payrollForm.employeeName,
      amount: payrollForm.amount,
      paymentMethod: payrollForm.paymentMethod,
      note: `Periode ${payrollForm.period}${payrollForm.note ? ` - ${payrollForm.note}` : ""}`
    }, "Pembayaran karyawan dicatat sebagai pengeluaran.");
    setPayrollForm({ employeeName: "", period: today.slice(0, 7), amount: 0, paymentDate: today, paymentMethod: "TUNAI", note: "" });
  }

  async function saveDebt() {
    await post({ action: debtEditId ? "updateDebt" : "createDebt", id: debtEditId ?? undefined, ...debtForm }, debtEditId ? "Utang/piutang diperbarui." : "Utang/piutang dicatat.");
    setDebtEditId(null);
    setDebtForm({ type: "UTANG", partyName: "", amount: 0, paidAmount: 0, dueDate: "", note: "" });
  }

  async function payDebt() {
    if (!paymentForm.id) return setMessage("Pilih utang/piutang terlebih dahulu.");
    await post({ action: "payDebt", ...paymentForm }, "Pembayaran utang/piutang dicatat.");
    setPaymentForm({ id: "", paymentAmount: 0, paymentDate: today, paymentNote: "" });
  }

  async function saveConsignment() {
    await post({ action: consignmentEditId ? "updateConsignment" : "createConsignment", id: consignmentEditId ?? undefined, ...consignmentForm }, consignmentEditId ? "Barang titip jual diperbarui." : "Barang titip jual dicatat.");
    setConsignmentEditId(null);
    setConsignmentForm({ supplierName: "", itemName: "", quantityReceived: 0, quantitySold: 0, sellPrice: 0, supplierPrice: 0, status: "ACTIVE", note: "" });
  }

  async function sellConsignment() {
    if (!sellForm.id) return setMessage("Pilih barang titip jual terlebih dahulu.");
    await post({ action: "sellConsignment", ...sellForm }, "Penjualan barang titip jual dicatat.");
    setSellForm({ id: "", sellQuantity: 1, note: "" });
  }

  if (!data) return <Title title="Keuangan" subtitle="Memuat pembukuan..." />;

  return (
    <>
      {dialog}
      <Title title="Keuangan" subtitle="Catat uang masuk, uang keluar, gaji, utang/piutang, dan barang titip jual." />
      <HelpNote items={["Kas adalah buku catatan uang masuk dan keluar.", "Pengeluaran dan gaji otomatis masuk sebagai kas keluar.", "Utang/piutang dicatat dulu, lalu kas berubah saat ada pembayaran."]} />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Kas Masuk" value={rupiah(data.summary.cashIn)} />
        <Metric label="Kas Keluar" value={rupiah(data.summary.cashOut)} />
        <Metric label="Gaji Karyawan" value={rupiah(data.summary.payroll)} />
        <Metric label="Utang Aktif" value={rupiah(data.summary.utangOpen)} />
      </div>
      {message && <div className="mt-4 rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
      <div className="mt-4 flex flex-wrap gap-2">
        {[["cash", "Kas"], ["expenses", "Pengeluaran"], ["payroll", "Gaji Karyawan"], ["debts", "Utang/Piutang"], ["consignment", "Titip Jual"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`h-10 rounded-md px-4 text-sm font-bold ring-1 ${tab === id ? "bg-leaf text-white ring-leaf" : "bg-white text-ink ring-black/10 hover:bg-skysoft"}`}>{label}</button>
        ))}
      </div>

      {tab === "cash" && (
        <AdminSection
          form={<>
            <Field label="Tipe"><Select value={cashForm.type} onChange={(e) => setCashForm({ ...cashForm, type: e.target.value })}><option value="CASH_IN">Kas Masuk</option><option value="CASH_OUT">Kas Keluar</option></Select></Field>
            <Field label="Kategori"><Input value={cashForm.category} onChange={(e) => setCashForm({ ...cashForm, category: e.target.value })} placeholder="Modal, koreksi kas, lainnya..." /></Field>
            <Field label="Nominal"><Input type="number" min={0} value={cashForm.amount} onChange={(e) => setCashForm({ ...cashForm, amount: Number(e.target.value) })} /></Field>
            <Field label="Tanggal"><Input type="date" value={cashForm.entryDate} onChange={(e) => setCashForm({ ...cashForm, entryDate: e.target.value })} /></Field>
            <Field label="Catatan"><Textarea value={cashForm.note} onChange={(e) => setCashForm({ ...cashForm, note: e.target.value })} /></Field>
            <Button disabled={!cashForm.category || !cashForm.amount} onClick={saveCash}>{cashEditId ? "Simpan Kas" : "Tambah Kas"}</Button>
          </>}
          table={<>
            <SimpleTable headers={["Tanggal", "Tipe", "Kategori", "Nominal", "Catatan", "Aksi"]} rows={cashPages.rows.map((x) => [new Date(x.entryDate).toLocaleDateString("id-ID"), x.type === "CASH_IN" ? "Masuk" : "Keluar", x.category, rupiah(x.amount), x.note || "-", <RowActions key={x.id} onEdit={() => { setCashEditId(x.id); setCashForm({ type: x.type, category: x.category, amount: x.amount, note: x.note ?? "", entryDate: x.entryDate }); }} onDelete={() => deleteRow("deleteCash", x.id, "Kas")} />])} empty="Belum ada data kas." />
            <PaginationControls {...cashPages} />
          </>}
        />
      )}

      {tab === "expenses" && (
        <AdminSection
          form={<>
            <Field label="Tanggal"><Input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} /></Field>
            <Field label="Kategori"><Input value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} placeholder="Belanja bahan, listrik, sewa..." /></Field>
            <Field label="Vendor"><Input value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} /></Field>
            <Field label="Nominal"><Input type="number" min={0} value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} /></Field>
            <Field label="Metode"><Select value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}><option value="TUNAI">Tunai</option><option value="QRIS">QRIS</option><option value="TRANSFER">Transfer</option></Select></Field>
            <Field label="Catatan"><Textarea value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} /></Field>
            <Button disabled={!expenseForm.category || !expenseForm.amount} onClick={saveExpense}>{expenseEditId ? "Simpan Pengeluaran" : "Catat Pengeluaran"}</Button>
          </>}
          table={<>
            <SimpleTable headers={["Tanggal", "Kategori", "Vendor", "Metode", "Nominal", "Aksi"]} rows={expensePages.rows.map((x) => [new Date(x.expenseDate).toLocaleDateString("id-ID"), x.category, x.vendor || "-", x.paymentMethod, rupiah(x.amount), <RowActions key={x.id} onEdit={() => { setExpenseEditId(x.id); setExpenseForm({ expenseDate: x.expenseDate, category: x.category, vendor: x.vendor ?? "", amount: x.amount, paymentMethod: x.paymentMethod, note: x.note ?? "" }); }} onDelete={() => deleteRow("deleteExpense", x.id, "Pengeluaran")} />])} empty="Belum ada pengeluaran." />
            <PaginationControls {...expensePages} />
          </>}
        />
      )}

      {tab === "payroll" && (
        <AdminSection
          form={<>
            <Field label="Nama Karyawan"><Input value={payrollForm.employeeName} onChange={(e) => setPayrollForm({ ...payrollForm, employeeName: e.target.value })} placeholder="Nama karyawan" /></Field>
            <Field label="Periode Gaji"><Input type="month" value={payrollForm.period} onChange={(e) => setPayrollForm({ ...payrollForm, period: e.target.value })} /></Field>
            <Field label="Tanggal Bayar"><Input type="date" value={payrollForm.paymentDate} onChange={(e) => setPayrollForm({ ...payrollForm, paymentDate: e.target.value })} /></Field>
            <Field label="Nominal"><Input type="number" min={0} value={payrollForm.amount} onChange={(e) => setPayrollForm({ ...payrollForm, amount: Number(e.target.value) })} /></Field>
            <Field label="Metode"><Select value={payrollForm.paymentMethod} onChange={(e) => setPayrollForm({ ...payrollForm, paymentMethod: e.target.value })}><option value="TUNAI">Tunai</option><option value="QRIS">QRIS</option><option value="TRANSFER">Transfer</option></Select></Field>
            <Field label="Catatan"><Textarea value={payrollForm.note} onChange={(e) => setPayrollForm({ ...payrollForm, note: e.target.value })} placeholder="Bonus, potongan, kasbon, dll." /></Field>
            <Button disabled={!payrollForm.employeeName || !payrollForm.amount} onClick={savePayroll}>Catat Pembayaran Gaji</Button>
          </>}
          table={<>
            <SimpleTable headers={["Tanggal", "Karyawan", "Periode/Catatan", "Metode", "Nominal", "Aksi"]} rows={payrollPages.rows.map((x) => [new Date(x.expenseDate).toLocaleDateString("id-ID"), x.vendor || "-", x.note || "-", x.paymentMethod, rupiah(x.amount), <RowActions key={x.id} onEdit={() => { setTab("expenses"); setExpenseEditId(x.id); setExpenseForm({ expenseDate: x.expenseDate, category: x.category, vendor: x.vendor ?? "", amount: x.amount, paymentMethod: x.paymentMethod, note: x.note ?? "" }); }} onDelete={() => deleteRow("deleteExpense", x.id, "Gaji Karyawan")} />])} empty="Belum ada pembayaran karyawan." />
            <PaginationControls {...payrollPages} />
          </>}
        />
      )}

      {tab === "debts" && (
        <AdminSection
          form={<>
            <Field label="Tipe"><Select value={debtForm.type} onChange={(e) => setDebtForm({ ...debtForm, type: e.target.value })}><option value="UTANG">Utang</option><option value="PIUTANG">Piutang</option></Select></Field>
            <Field label="Nama Pihak"><Input value={debtForm.partyName} onChange={(e) => setDebtForm({ ...debtForm, partyName: e.target.value })} placeholder="Supplier / pelanggan" /></Field>
            <Field label="Nominal"><Input type="number" min={0} value={debtForm.amount} onChange={(e) => setDebtForm({ ...debtForm, amount: Number(e.target.value) })} /></Field>
            <Field label="Sudah Dibayar"><Input type="number" min={0} value={debtForm.paidAmount} onChange={(e) => setDebtForm({ ...debtForm, paidAmount: Number(e.target.value) })} /></Field>
            <Field label="Jatuh Tempo"><Input type="date" value={debtForm.dueDate} onChange={(e) => setDebtForm({ ...debtForm, dueDate: e.target.value })} /></Field>
            <Field label="Catatan"><Textarea value={debtForm.note} onChange={(e) => setDebtForm({ ...debtForm, note: e.target.value })} /></Field>
            <Button disabled={!debtForm.partyName || !debtForm.amount} onClick={saveDebt}>{debtEditId ? "Simpan Utang/Piutang" : "Tambah Utang/Piutang"}</Button>
            <div className="mt-2 border-t border-black/10 pt-3">
              <h3 className="mb-2 font-bold">Catat Pembayaran</h3>
              <Field label="Data"><Select value={paymentForm.id} onChange={(e) => setPaymentForm({ ...paymentForm, id: e.target.value })}><option value="">Pilih utang/piutang</option>{data.debts.filter((x: any) => x.status !== "PAID").map((x: any) => <option key={x.id} value={x.id}>{x.type} - {x.partyName} - sisa {rupiah(x.remainingAmount)}</option>)}</Select></Field>
              <Field label="Nominal Bayar/Terima"><Input type="number" min={0} value={paymentForm.paymentAmount} onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: Number(e.target.value) })} /></Field>
              <Field label="Tanggal"><Input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} /></Field>
              <SecondaryButton disabled={!paymentForm.id || !paymentForm.paymentAmount} onClick={payDebt}>Catat Pembayaran</SecondaryButton>
            </div>
          </>}
          table={<>
            <SimpleTable headers={["Tipe", "Pihak", "Nominal", "Terbayar", "Sisa", "Status", "Aksi"]} rows={debtPages.rows.map((x) => [x.type, x.partyName, rupiah(x.amount), rupiah(x.paidAmount), rupiah(x.remainingAmount), x.status, <RowActions key={x.id} onEdit={() => { setDebtEditId(x.id); setDebtForm({ type: x.type, partyName: x.partyName, amount: x.amount, paidAmount: x.paidAmount, dueDate: x.dueDate ?? "", note: x.note ?? "" }); }} onDelete={() => deleteRow("deleteDebt", x.id, "Utang/Piutang")} />])} empty="Belum ada utang/piutang." />
            <PaginationControls {...debtPages} />
          </>}
        />
      )}

      {tab === "consignment" && (
        <AdminSection
          form={<>
            <Field label="Supplier/Pemilik Barang"><Input value={consignmentForm.supplierName} onChange={(e) => setConsignmentForm({ ...consignmentForm, supplierName: e.target.value })} /></Field>
            <Field label="Nama Barang"><Input value={consignmentForm.itemName} onChange={(e) => setConsignmentForm({ ...consignmentForm, itemName: e.target.value })} /></Field>
            <Field label="Jumlah Diterima"><Input type="number" min={0} value={consignmentForm.quantityReceived} onChange={(e) => setConsignmentForm({ ...consignmentForm, quantityReceived: Number(e.target.value) })} /></Field>
            <Field label="Jumlah Terjual"><Input type="number" min={0} value={consignmentForm.quantitySold} onChange={(e) => setConsignmentForm({ ...consignmentForm, quantitySold: Number(e.target.value) })} /></Field>
            <Field label="Harga Jual"><Input type="number" min={0} value={consignmentForm.sellPrice} onChange={(e) => setConsignmentForm({ ...consignmentForm, sellPrice: Number(e.target.value) })} /></Field>
            <Field label="Setoran ke Supplier / pcs"><Input type="number" min={0} value={consignmentForm.supplierPrice} onChange={(e) => setConsignmentForm({ ...consignmentForm, supplierPrice: Number(e.target.value) })} /></Field>
            <Field label="Status"><Select value={consignmentForm.status} onChange={(e) => setConsignmentForm({ ...consignmentForm, status: e.target.value })}><option value="ACTIVE">Aktif</option><option value="FINISHED">Selesai</option></Select></Field>
            <Field label="Catatan"><Textarea value={consignmentForm.note} onChange={(e) => setConsignmentForm({ ...consignmentForm, note: e.target.value })} /></Field>
            <Button disabled={!consignmentForm.supplierName || !consignmentForm.itemName || !consignmentForm.quantityReceived || !consignmentForm.sellPrice} onClick={saveConsignment}>{consignmentEditId ? "Simpan Titip Jual" : "Tambah Titip Jual"}</Button>
            <div className="mt-2 border-t border-black/10 pt-3">
              <h3 className="mb-2 font-bold">Catat Barang Terjual</h3>
              <Field label="Barang"><Select value={sellForm.id} onChange={(e) => setSellForm({ ...sellForm, id: e.target.value })}><option value="">Pilih barang</option>{data.consignments.filter((x: any) => x.remainingQuantity > 0).map((x: any) => <option key={x.id} value={x.id}>{x.itemName} - sisa {x.remainingQuantity}</option>)}</Select></Field>
              <Field label="Jumlah Terjual"><Input type="number" min={1} value={sellForm.sellQuantity} onChange={(e) => setSellForm({ ...sellForm, sellQuantity: Number(e.target.value) })} /></Field>
              <SecondaryButton disabled={!sellForm.id || !sellForm.sellQuantity} onClick={sellConsignment}>Catat Terjual</SecondaryButton>
            </div>
          </>}
          table={<>
            <SimpleTable headers={["Supplier", "Barang", "Diterima", "Terjual", "Sisa", "Omzet", "Setoran", "Status", "Aksi"]} rows={consignmentPages.rows.map((x) => [x.supplierName, x.itemName, x.quantityReceived, x.quantitySold, x.remainingQuantity, rupiah(x.grossSales), rupiah(x.payableToSupplier), x.status, <RowActions key={x.id} onEdit={() => { setConsignmentEditId(x.id); setConsignmentForm({ supplierName: x.supplierName, itemName: x.itemName, quantityReceived: x.quantityReceived, quantitySold: x.quantitySold, sellPrice: x.sellPrice, supplierPrice: x.supplierPrice, status: x.status, note: x.note ?? "" }); }} onDelete={() => deleteRow("deleteConsignment", x.id, "Titip Jual")} />])} empty="Belum ada barang titip jual." />
            <PaginationControls {...consignmentPages} />
          </>}
        />
      )}
    </>
  );
}