import { db, exec, row, rows } from "@/lib/database";
import type { AdminFinanceRows, CashLedgerRow, ConsignmentRow, DebtRow, ExpenseRow } from "@/types/admin-finance";

export async function listAdminFinanceRows(): Promise<AdminFinanceRows> {
  const database = await db();
  const cashRows = await rows<CashLedgerRow>(database, "SELECT * FROM cash_ledger ORDER BY entryDate DESC, createdAt DESC LIMIT 300");
  const expenseRows = await rows<ExpenseRow>(database, "SELECT * FROM expenses ORDER BY expenseDate DESC, createdAt DESC LIMIT 300");
  const debtRows = await rows<DebtRow>(database, "SELECT * FROM debts ORDER BY createdAt DESC LIMIT 300");
  const consignmentRows = await rows<ConsignmentRow>(database, "SELECT * FROM consignment_items ORDER BY createdAt DESC LIMIT 300");
  return { cashRows, expenseRows, debtRows, consignmentRows };
}

export async function deleteManualCash(id: string) {
  await exec(await db(), "DELETE FROM cash_ledger WHERE id=? AND source='MANUAL'", [id]);
}

export async function updateManualCash(data: { id: string; type: string; category: string; amount: number; note: string; entryDate: string; updatedAt: string }) {
  await exec(await db(), "UPDATE cash_ledger SET type=?, category=?, amount=?, note=?, entryDate=?, updatedAt=? WHERE id=? AND source='MANUAL'", [data.type, data.category, data.amount, data.note, data.entryDate, data.updatedAt, data.id]);
}

export async function createManualCash(data: { id: string; type: string; category: string; amount: number; note: string; entryDate: string; createdBy: string; createdAt: string; updatedAt: string }) {
  await exec(await db(), "INSERT INTO cash_ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.id, data.type, "MANUAL", null, data.category, data.amount, data.note, data.entryDate, data.createdBy, data.createdAt, data.updatedAt]);
}

export async function deleteExpense(id: string) {
  const database = await db();
  await exec(database, "DELETE FROM expenses WHERE id=?", [id]);
  await exec(database, "DELETE FROM cash_ledger WHERE source='EXPENSE' AND referenceId=?", [id]);
}

export async function updateExpense(data: { id: string; expenseDate: string; category: string; vendor: string; amount: number; paymentMethod: string; note: string; updatedAt: string }) {
  const database = await db();
  await exec(database, "UPDATE expenses SET expenseDate=?, category=?, vendor=?, amount=?, paymentMethod=?, note=?, updatedAt=? WHERE id=?", [data.expenseDate, data.category, data.vendor, data.amount, data.paymentMethod, data.note, data.updatedAt, data.id]);
  await exec(database, "UPDATE cash_ledger SET category=?, amount=?, note=?, entryDate=?, updatedAt=? WHERE source='EXPENSE' AND referenceId=?", [`Pengeluaran: ${data.category}`, data.amount, data.note || data.vendor, data.expenseDate, data.updatedAt, data.id]);
}

export async function createExpenseWithLedger(data: { id: string; ledgerId: string; expenseDate: string; category: string; vendor: string; amount: number; paymentMethod: string; note: string; createdBy: string; createdAt: string; updatedAt: string }) {
  const database = await db();
  await exec(database, "INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.id, data.expenseDate, data.category, data.vendor, data.amount, data.paymentMethod, data.note, data.createdBy, data.createdAt, data.updatedAt]);
  await exec(database, "INSERT INTO cash_ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.ledgerId, "CASH_OUT", "EXPENSE", data.id, `Pengeluaran: ${data.category}`, data.amount, data.note || data.vendor, data.expenseDate, data.createdBy, data.createdAt, data.updatedAt]);
}

export async function deleteDebt(id: string) {
  const database = await db();
  await exec(database, "DELETE FROM debt_payments WHERE debtId=?", [id]);
  await exec(database, "DELETE FROM debts WHERE id=?", [id]);
}

export async function findDebt(id: string) {
  return await row<DebtRow>(await db(), "SELECT * FROM debts WHERE id=?", [id]);
}

export async function createDebtPaymentWithLedger(data: { id: string; debtId: string; amount: number; paymentDate: string; note: string; createdBy: string; createdAt: string; newPaidAmount: number; newStatus: string; ledgerId: string; ledgerType: string; ledgerCategory: string }) {
  const database = await db();
  await exec(database, "INSERT INTO debt_payments VALUES (?, ?, ?, ?, ?, ?, ?)", [data.id, data.debtId, data.amount, data.paymentDate, data.note, data.createdBy, data.createdAt]);
  await exec(database, "UPDATE debts SET paidAmount=?, status=?, updatedAt=? WHERE id=?", [data.newPaidAmount, data.newStatus, data.createdAt, data.debtId]);
  await exec(database, "INSERT INTO cash_ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.ledgerId, data.ledgerType, "DEBT_PAYMENT", data.debtId, data.ledgerCategory, data.amount, data.note, data.paymentDate, data.createdBy, data.createdAt, data.createdAt]);
}

export async function updateDebt(data: { id: string; type: string; partyName: string; amount: number; paidAmount: number; dueDate: string; status: string; note: string; updatedAt: string }) {
  await exec(await db(), "UPDATE debts SET type=?, partyName=?, amount=?, paidAmount=?, dueDate=?, status=?, note=?, updatedAt=? WHERE id=?", [data.type, data.partyName, data.amount, data.paidAmount, data.dueDate, data.status, data.note, data.updatedAt, data.id]);
}

export async function createDebt(data: { id: string; type: string; partyName: string; amount: number; dueDate: string; note: string; createdBy: string; createdAt: string; updatedAt: string }) {
  await exec(await db(), "INSERT INTO debts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.id, data.type, data.partyName, data.amount, 0, data.dueDate, "OPEN", data.note, data.createdBy, data.createdAt, data.updatedAt]);
}

export async function deleteConsignment(id: string) {
  await exec(await db(), "DELETE FROM consignment_items WHERE id=?", [id]);
}

export async function findConsignment(id: string) {
  return await row<ConsignmentRow>(await db(), "SELECT * FROM consignment_items WHERE id=?", [id]);
}

export async function sellConsignmentWithLedger(data: { id: string; quantitySold: number; status: string; updatedAt: string; ledgerId: string; ledgerAmount: number; note: string; entryDate: string; createdBy: string; itemName: string }) {
  const database = await db();
  await exec(database, "UPDATE consignment_items SET quantitySold=?, status=?, updatedAt=? WHERE id=?", [data.quantitySold, data.status, data.updatedAt, data.id]);
  await exec(database, "INSERT INTO cash_ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.ledgerId, "CASH_IN", "CONSIGNMENT", data.id, `Titip jual: ${data.itemName}`, data.ledgerAmount, data.note, data.entryDate, data.createdBy, data.updatedAt, data.updatedAt]);
}

export async function updateConsignment(data: { id: string; supplierName: string; itemName: string; quantityReceived: number; quantitySold: number; sellPrice: number; supplierPrice: number; status: string; note: string; updatedAt: string }) {
  await exec(await db(), "UPDATE consignment_items SET supplierName=?, itemName=?, quantityReceived=?, quantitySold=?, sellPrice=?, supplierPrice=?, status=?, note=?, updatedAt=? WHERE id=?", [data.supplierName, data.itemName, data.quantityReceived, data.quantitySold, data.sellPrice, data.supplierPrice, data.status, data.note, data.updatedAt, data.id]);
}

export async function createConsignment(data: { id: string; supplierName: string; itemName: string; quantityReceived: number; quantitySold: number; sellPrice: number; supplierPrice: number; status: string; note: string; createdBy: string; createdAt: string; updatedAt: string }) {
  await exec(await db(), "INSERT INTO consignment_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.id, data.supplierName, data.itemName, data.quantityReceived, data.quantitySold, data.sellPrice, data.supplierPrice, data.status, data.note, data.createdBy, data.createdAt, data.updatedAt]);
}
