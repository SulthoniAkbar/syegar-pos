import { db, exec, row, rows } from "@/lib/database";
import type { ActiveShiftRow, IngredientStockRow, RecipeRow, StockMovementRow, TransactionMenu, TransactionRow } from "@/types/kasir";

export async function listRecentTransactions() {
  const database = await db();
  const transactions = await rows<TransactionRow & Record<string, unknown>>(database, "SELECT t.*, u.name AS cashierName FROM transactions t JOIN users u ON u.id=t.cashierId ORDER BY paidAt DESC LIMIT 100");
  const transactionIds = transactions.map((transaction) => transaction.id);
  const items = transactionIds.length ? await rows<any>(database, "SELECT * FROM transaction_items WHERE transactionId = ANY(?)", [transactionIds]) : [];
  const itemsByTransaction = new Map<string, any[]>();
  for (const item of items) itemsByTransaction.set(item.transactionId, [...(itemsByTransaction.get(item.transactionId) ?? []), item]);
  return transactions.map((transaction) => ({
    ...transaction,
    cashier: { name: transaction.cashierName },
    items: itemsByTransaction.get(transaction.id) ?? []
  }));
}

export async function findActiveCashier(cashierId: string) {
  return await row<{ id: string }>(await db(), "SELECT id FROM users WHERE id=? AND active=1", [cashierId]);
}

export async function findActiveShift(cashierId: string) {
  return await row<ActiveShiftRow>(await db(), "SELECT * FROM shifts WHERE status='ACTIVE' AND cashierId=? ORDER BY openedAt DESC LIMIT 1", [cashierId]);
}

export async function findActiveMenu(menuId: string) {
  return await row<TransactionMenu>(await db(), "SELECT * FROM menus WHERE id=? AND active=1", [menuId]);
}

export async function listMenuRecipes(menuId: string) {
  return await rows<RecipeRow>(await db(), "SELECT * FROM recipe_items WHERE menuId=?", [menuId]);
}

export async function findIngredientStock(ingredientId: string) {
  return await row<IngredientStockRow>(await db(), "SELECT * FROM ingredients WHERE id=?", [ingredientId]);
}

export async function createPaidTransaction(data: {
  id: string;
  receiptNumber: string;
  cashierId: string;
  shiftId: string;
  paymentMethod: string;
  total: number;
  cashReceived: number | null;
  changeAmount: number | null;
  paidAt: string;
  items: Array<{ id: string; menuId: string; menuName: string; unitPrice: number; quantity: number; lineTotal: number; options: Array<{ id: string; optionId: string | null; optionName: string; extraPrice: number }> }>;
  stockMovements: Array<{ id: string; ingredientId: string; quantity: number; note: string; transactionId: string; createdAt: string }>;
}) {
  const database = await db();
  await exec(database, "BEGIN");
  try {
    await exec(database, "INSERT INTO transactions (id, receiptNumber, cashierId, shiftId, paymentMethod, status, subtotal, total, cashReceived, changeAmount, paidAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.id, data.receiptNumber, data.cashierId, data.shiftId, data.paymentMethod, "PAID", data.total, data.total, data.cashReceived, data.changeAmount, data.paidAt, data.paidAt]);
    for (const item of data.items) {
      await exec(database, "INSERT INTO transaction_items VALUES (?, ?, ?, ?, ?, ?, ?)", [item.id, data.id, item.menuId, item.menuName, item.unitPrice, item.quantity, item.lineTotal]);
      for (const option of item.options) await exec(database, "INSERT INTO transaction_item_options VALUES (?, ?, ?, ?, ?)", [option.id, item.id, option.optionId, option.optionName, option.extraPrice]);
    }
    for (const movement of data.stockMovements) {
      await exec(database, "UPDATE ingredients SET currentStock=currentStock-?, updatedAt=? WHERE id=?", [movement.quantity, movement.createdAt, movement.ingredientId]);
      await exec(database, "INSERT INTO stock_movements VALUES (?, ?, ?, ?, ?, ?, ?)", [movement.id, movement.ingredientId, "SALE", -movement.quantity, movement.note, movement.transactionId, movement.createdAt]);
    }
    await exec(database, "COMMIT");
  } catch (error) {
    await exec(database, "ROLLBACK");
    throw error;
  }
}

export async function findTransaction(transactionId: string) {
  return await row<any>(await db(), "SELECT * FROM transactions WHERE id=?", [transactionId]);
}

export async function listSaleMovements(transactionId: string) {
  return await rows<StockMovementRow>(await db(), "SELECT * FROM stock_movements WHERE transactionId=? AND type='SALE'", [transactionId]);
}

export async function voidTransaction(data: { transactionId: string; reason: string; updatedAt: string; movements: Array<{ id: string; ingredientId: string; quantity: number }> }) {
  const database = await db();
  await exec(database, "BEGIN");
  try {
    for (const movement of data.movements) {
      await exec(database, "UPDATE ingredients SET currentStock=currentStock+?, updatedAt=? WHERE id=?", [movement.quantity, data.updatedAt, movement.ingredientId]);
      await exec(database, "INSERT INTO stock_movements VALUES (?, ?, ?, ?, ?, ?, ?)", [movement.id, movement.ingredientId, "VOID_RESTORE", movement.quantity, data.reason, data.transactionId, data.updatedAt]);
    }
    await exec(database, "UPDATE transactions SET status='VOID' WHERE id=?", [data.transactionId]);
    await exec(database, "COMMIT");
  } catch (error) {
    await exec(database, "ROLLBACK");
    throw error;
  }
}
