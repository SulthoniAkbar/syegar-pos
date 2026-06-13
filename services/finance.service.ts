import { z } from "zod";
import { audit } from "@/lib/audit";
import { db, id, now, persist } from "@/lib/database";
import { AppError } from "@/lib/http";
import * as financeRepository from "@/repositories/finance.repository";
import type { AdminFinanceRows, AdminFinanceUser } from "@/types/admin-finance";

const cashSchema = z.object({
  action: z.enum(["createCash", "updateCash", "deleteCash"]),
  id: z.string().optional(),
  type: z.enum(["CASH_IN", "CASH_OUT"]).optional(),
  category: z.string().min(2).optional(),
  amount: z.coerce.number().int().positive().optional(),
  note: z.string().optional().default(""),
  entryDate: z.string().optional()
});

const expenseSchema = z.object({
  action: z.enum(["createExpense", "updateExpense", "deleteExpense"]),
  id: z.string().optional(),
  expenseDate: z.string().optional(),
  category: z.string().min(2).optional(),
  vendor: z.string().optional().default(""),
  amount: z.coerce.number().int().positive().optional(),
  paymentMethod: z.enum(["TUNAI", "QRIS", "TRANSFER"]).optional().default("TUNAI"),
  note: z.string().optional().default("")
});

const debtSchema = z.object({
  action: z.enum(["createDebt", "updateDebt", "deleteDebt", "payDebt"]),
  id: z.string().optional(),
  type: z.enum(["UTANG", "PIUTANG"]).optional(),
  partyName: z.string().min(2).optional(),
  amount: z.coerce.number().int().positive().optional(),
  paidAmount: z.coerce.number().int().min(0).optional(),
  dueDate: z.string().optional().default(""),
  note: z.string().optional().default(""),
  paymentAmount: z.coerce.number().int().positive().optional(),
  paymentDate: z.string().optional(),
  paymentNote: z.string().optional().default("")
});

const consignmentSchema = z.object({
  action: z.enum(["createConsignment", "updateConsignment", "deleteConsignment", "sellConsignment"]),
  id: z.string().optional(),
  supplierName: z.string().min(2).optional(),
  itemName: z.string().min(2).optional(),
  quantityReceived: z.coerce.number().int().positive().optional(),
  quantitySold: z.coerce.number().int().min(0).optional(),
  sellPrice: z.coerce.number().int().positive().optional(),
  supplierPrice: z.coerce.number().int().min(0).optional(),
  status: z.enum(["ACTIVE", "FINISHED"]).optional(),
  note: z.string().optional().default(""),
  sellQuantity: z.coerce.number().int().positive().optional()
});

export async function getAdminFinanceDashboard() {
  const financeRows = await financeRepository.listAdminFinanceRows();
  return decorateAdminFinanceRows(financeRows);
}

export async function mutateAdminFinance(rawBody: unknown, user: AdminFinanceUser) {
  const body = rawBody as { action?: unknown };
  const action = String(body.action ?? "");

  if (action.includes("Cash")) await handleCash(cashSchema.parse(rawBody), user);
  else if (action.includes("Expense")) await handleExpense(expenseSchema.parse(rawBody), user);
  else if (action.includes("Debt")) await handleDebt(debtSchema.parse(rawBody), user);
  else if (action.includes("Consignment")) await handleConsignment(consignmentSchema.parse(rawBody), user);
  else throw new AppError("Aksi admin keuangan tidak dikenal.", 422);

  await persist(await db());
  return true;
}

function decorateAdminFinanceRows({ cashRows, expenseRows, debtRows, consignmentRows }: AdminFinanceRows) {
  return {
    summary: {
      cashIn: sumCash(cashRows, "CASH_IN"),
      cashOut: sumCash(cashRows, "CASH_OUT"),
      expenses: expenseRows.reduce((total, item) => total + Number(item.amount), 0),
      payroll: expenseRows.filter((item) => item.category === "Gaji Karyawan").reduce((total, item) => total + Number(item.amount), 0),
      utangOpen: debtRows.filter((item) => item.type === "UTANG" && item.status !== "PAID").reduce((total, item) => total + Number(item.amount) - Number(item.paidAmount), 0),
      piutangOpen: debtRows.filter((item) => item.type === "PIUTANG" && item.status !== "PAID").reduce((total, item) => total + Number(item.amount) - Number(item.paidAmount), 0),
      consignmentPotential: consignmentRows.reduce((total, item) => total + Math.max(0, Number(item.quantityReceived) - Number(item.quantitySold)) * Number(item.sellPrice), 0)
    },
    cash: cashRows,
    expenses: expenseRows,
    debts: debtRows.map((item) => ({ ...item, remainingAmount: Number(item.amount) - Number(item.paidAmount) })),
    consignments: consignmentRows.map((item) => ({
      ...item,
      remainingQuantity: Number(item.quantityReceived) - Number(item.quantitySold),
      grossSales: Number(item.quantitySold) * Number(item.sellPrice),
      payableToSupplier: Number(item.quantitySold) * Number(item.supplierPrice)
    }))
  };
}

function sumCash(items: { type: string; amount: number }[], type: string) {
  return items.filter((item) => item.type === type).reduce((total, item) => total + Number(item.amount), 0);
}

async function handleCash(body: z.infer<typeof cashSchema>, user: AdminFinanceUser) {
  const t = now();
  const database = await db();
  if (body.action === "deleteCash") {
    if (!body.id) throw new AppError("ID kas wajib diisi.", 422);
    await financeRepository.deleteManualCash(body.id);
    await audit(database, user, "DELETE_CASH_LEDGER", "cash_ledger", body.id, {});
    return;
  }
  if (body.action === "updateCash") {
    if (!body.id || !body.type || !body.category || !body.amount || !body.entryDate) throw new AppError("Data kas belum lengkap.", 422);
    await financeRepository.updateManualCash({ id: body.id, type: body.type, category: body.category, amount: body.amount, note: body.note ?? "", entryDate: body.entryDate, updatedAt: t });
    await audit(database, user, "UPDATE_CASH_LEDGER", "cash_ledger", body.id, body);
    return;
  }
  if (!body.type || !body.category || !body.amount || !body.entryDate) throw new AppError("Data kas belum lengkap.", 422);
  const cashId = id();
  await financeRepository.createManualCash({ id: cashId, type: body.type, category: body.category, amount: body.amount, note: body.note ?? "", entryDate: body.entryDate, createdBy: user.name, createdAt: t, updatedAt: t });
  await audit(database, user, "CREATE_CASH_LEDGER", "cash_ledger", cashId, body);
}

async function handleExpense(body: z.infer<typeof expenseSchema>, user: AdminFinanceUser) {
  const t = now();
  const database = await db();
  if (body.action === "deleteExpense") {
    if (!body.id) throw new AppError("ID pengeluaran wajib diisi.", 422);
    await financeRepository.deleteExpense(body.id);
    await audit(database, user, "DELETE_EXPENSE", "expenses", body.id, {});
    return;
  }
  if (body.action === "updateExpense") {
    if (!body.id || !body.expenseDate || !body.category || !body.amount) throw new AppError("Data pengeluaran belum lengkap.", 422);
    await financeRepository.updateExpense({ id: body.id, expenseDate: body.expenseDate, category: body.category, vendor: body.vendor ?? "", amount: body.amount, paymentMethod: body.paymentMethod, note: body.note ?? "", updatedAt: t });
    await audit(database, user, "UPDATE_EXPENSE", "expenses", body.id, body);
    return;
  }
  if (!body.expenseDate || !body.category || !body.amount) throw new AppError("Data pengeluaran belum lengkap.", 422);
  const expenseId = id();
  await financeRepository.createExpenseWithLedger({ id: expenseId, ledgerId: id(), expenseDate: body.expenseDate, category: body.category, vendor: body.vendor ?? "", amount: body.amount, paymentMethod: body.paymentMethod, note: body.note ?? "", createdBy: user.name, createdAt: t, updatedAt: t });
  await audit(database, user, "CREATE_EXPENSE", "expenses", expenseId, body);
}

async function handleDebt(body: z.infer<typeof debtSchema>, user: AdminFinanceUser) {
  const t = now();
  const database = await db();
  if (body.action === "deleteDebt") {
    if (!body.id) throw new AppError("ID utang/piutang wajib diisi.", 422);
    await financeRepository.deleteDebt(body.id);
    await audit(database, user, "DELETE_DEBT", "debts", body.id, {});
    return;
  }
  if (body.action === "payDebt") {
    if (!body.id || !body.paymentAmount || !body.paymentDate) throw new AppError("Data pembayaran belum lengkap.", 422);
    const debt = await financeRepository.findDebt(body.id);
    if (!debt) throw new AppError("Data utang/piutang tidak ditemukan.", 404);
    const paidAmount = Math.min(Number(debt.amount), Number(debt.paidAmount) + body.paymentAmount);
    const status = paidAmount >= Number(debt.amount) ? "PAID" : "PARTIAL";
    const ledgerType = debt.type === "UTANG" ? "CASH_OUT" : "CASH_IN";
    const ledgerCategory = debt.type === "UTANG" ? `Bayar utang: ${debt.partyName}` : `Terima piutang: ${debt.partyName}`;
    await financeRepository.createDebtPaymentWithLedger({ id: id(), debtId: body.id, amount: body.paymentAmount, paymentDate: body.paymentDate, note: body.paymentNote ?? "", createdBy: user.name, createdAt: t, newPaidAmount: paidAmount, newStatus: status, ledgerId: id(), ledgerType, ledgerCategory });
    await audit(database, user, "PAY_DEBT", "debts", body.id, { amount: body.paymentAmount });
    return;
  }
  if (body.action === "updateDebt") {
    if (!body.id || !body.type || !body.partyName || !body.amount) throw new AppError("Data utang/piutang belum lengkap.", 422);
    const paidAmount = Math.min(body.paidAmount ?? 0, body.amount);
    const status = paidAmount <= 0 ? "OPEN" : paidAmount >= body.amount ? "PAID" : "PARTIAL";
    await financeRepository.updateDebt({ id: body.id, type: body.type, partyName: body.partyName, amount: body.amount, paidAmount, dueDate: body.dueDate ?? "", status, note: body.note ?? "", updatedAt: t });
    await audit(database, user, "UPDATE_DEBT", "debts", body.id, body);
    return;
  }
  if (!body.type || !body.partyName || !body.amount) throw new AppError("Data utang/piutang belum lengkap.", 422);
  const debtId = id();
  await financeRepository.createDebt({ id: debtId, type: body.type, partyName: body.partyName, amount: body.amount, dueDate: body.dueDate ?? "", note: body.note ?? "", createdBy: user.name, createdAt: t, updatedAt: t });
  await audit(database, user, "CREATE_DEBT", "debts", debtId, body);
}

async function handleConsignment(body: z.infer<typeof consignmentSchema>, user: AdminFinanceUser) {
  const t = now();
  const database = await db();
  if (body.action === "deleteConsignment") {
    if (!body.id) throw new AppError("ID barang titip jual wajib diisi.", 422);
    await financeRepository.deleteConsignment(body.id);
    await audit(database, user, "DELETE_CONSIGNMENT", "consignment_items", body.id, {});
    return;
  }
  if (body.action === "sellConsignment") {
    if (!body.id || !body.sellQuantity) throw new AppError("Jumlah terjual wajib diisi.", 422);
    const item = await financeRepository.findConsignment(body.id);
    if (!item) throw new AppError("Barang titip jual tidak ditemukan.", 404);
    const sold = Number(item.quantitySold) + body.sellQuantity;
    if (sold > Number(item.quantityReceived)) throw new AppError("Jumlah terjual melebihi barang diterima.", 422);
    const status = sold >= Number(item.quantityReceived) ? "FINISHED" : "ACTIVE";
    await financeRepository.sellConsignmentWithLedger({ id: body.id, quantitySold: sold, status, updatedAt: t, ledgerId: id(), ledgerAmount: body.sellQuantity * Number(item.sellPrice), note: body.note ?? "", entryDate: t.slice(0, 10), createdBy: user.name, itemName: item.itemName });
    await audit(database, user, "SELL_CONSIGNMENT", "consignment_items", body.id, { quantity: body.sellQuantity });
    return;
  }
  if (body.action === "updateConsignment") {
    if (!body.id || !body.supplierName || !body.itemName || !body.quantityReceived || !body.sellPrice) throw new AppError("Data titip jual belum lengkap.", 422);
    const quantitySold = Math.min(body.quantitySold ?? 0, body.quantityReceived);
    const status = body.status ?? (quantitySold >= body.quantityReceived ? "FINISHED" : "ACTIVE");
    await financeRepository.updateConsignment({ id: body.id, supplierName: body.supplierName, itemName: body.itemName, quantityReceived: body.quantityReceived, quantitySold, sellPrice: body.sellPrice, supplierPrice: body.supplierPrice ?? 0, status, note: body.note ?? "", updatedAt: t });
    await audit(database, user, "UPDATE_CONSIGNMENT", "consignment_items", body.id, body);
    return;
  }
  if (!body.supplierName || !body.itemName || !body.quantityReceived || !body.sellPrice) throw new AppError("Data titip jual belum lengkap.", 422);
  const consignmentId = id();
  await financeRepository.createConsignment({ id: consignmentId, supplierName: body.supplierName, itemName: body.itemName, quantityReceived: body.quantityReceived, quantitySold: body.quantitySold ?? 0, sellPrice: body.sellPrice, supplierPrice: body.supplierPrice ?? 0, status: body.status ?? "ACTIVE", note: body.note ?? "", createdBy: user.name, createdAt: t, updatedAt: t });
  await audit(database, user, "CREATE_CONSIGNMENT", "consignment_items", consignmentId, body);
}
