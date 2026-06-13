import { db, exec, row, rows, scalar } from "@/lib/database";

export type Db = Awaited<ReturnType<typeof db>>;

export async function getActiveShift(database: Db, cashierId?: string) {
  if (cashierId) return row<any>(database, "SELECT s.*, COALESCE(u.name, 'Kasir') AS cashierName FROM shifts s LEFT JOIN users u ON u.id=s.cashierId WHERE s.status='ACTIVE' AND s.cashierId=? ORDER BY s.openedAt DESC LIMIT 1", [cashierId]);
  return row<any>(database, "SELECT s.*, COALESCE(u.name, 'Kasir') AS cashierName FROM shifts s LEFT JOIN users u ON u.id=s.cashierId WHERE s.status='ACTIVE' ORDER BY s.openedAt DESC LIMIT 1");
}

export async function getLatestClosedShift(database: Db) {
  return await row<any>(database, "SELECT s.*, COALESCE(u.name, 'Kasir') AS cashierName FROM shifts s LEFT JOIN users u ON u.id=s.cashierId WHERE s.status='CLOSED' ORDER BY s.closedAt DESC LIMIT 1");
}

export async function listShiftHistory(database: Db) {
  return await rows<any>(database, "SELECT s.*, COALESCE(u.name, 'Kasir') AS cashierName FROM shifts s LEFT JOIN users u ON u.id=s.cashierId ORDER BY CASE WHEN s.status='ACTIVE' THEN 0 ELSE 1 END, COALESCE(NULLIF(s.closedAt, ''), s.openedAt) DESC LIMIT 50");
}

export async function findActiveCashier(database: Db, cashierId: string) {
  return await row<any>(database, "SELECT id, name FROM users WHERE id=? AND active=1", [cashierId]);
}

export async function insertShift(database: Db, shift: any) {
  await exec(database, "INSERT INTO shifts (id, cashierId, openedAt, closedAt, openingCash, closingCashActual, expectedCash, cashDifference, totalSales, totalTransactions, totalItemsSold, totalCashPayment, totalQrisPayment, totalDiscount, totalVoided, notes, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    shift.id, shift.cashierId, shift.openedAt, shift.closedAt, shift.openingCash, shift.closingCashActual, shift.expectedCash, shift.cashDifference, shift.totalSales, shift.totalTransactions, shift.totalItemsSold, shift.totalCashPayment, shift.totalQrisPayment, shift.totalDiscount, shift.totalVoided, shift.notes, shift.status, shift.createdAt, shift.updatedAt
  ]);
}

export async function getSummaryNumbers(database: Db, shiftId: string) {
  return {
    totalTransactions: await scalar<number>(database, "SELECT COUNT(*) FROM transactions WHERE shiftId=? AND status='PAID'", [shiftId]) ?? 0,
    totalVoided: await scalar<number>(database, "SELECT COUNT(*) FROM transactions WHERE shiftId=? AND status='VOID'", [shiftId]) ?? 0,
    totalItemsSold: await scalar<number>(database, "SELECT COALESCE(SUM(ti.quantity),0) FROM transaction_items ti JOIN transactions t ON t.id=ti.transactionId WHERE t.shiftId=? AND t.status='PAID'", [shiftId]) ?? 0,
    totalSales: await scalar<number>(database, "SELECT COALESCE(SUM(total),0) FROM transactions WHERE shiftId=? AND status='PAID'", [shiftId]) ?? 0,
    totalCashPayment: await scalar<number>(database, "SELECT COALESCE(SUM(total),0) FROM transactions WHERE shiftId=? AND status='PAID' AND paymentMethod='TUNAI'", [shiftId]) ?? 0,
    totalQrisPayment: await scalar<number>(database, "SELECT COALESCE(SUM(total),0) FROM transactions WHERE shiftId=? AND status='PAID' AND paymentMethod='QRIS'", [shiftId]) ?? 0
  };
}

export async function listShiftItems(database: Db, shiftId: string) {
  return await rows<any>(database, `SELECT ti.menuId, ti.menuName, SUM(ti.quantity) AS quantitySold, SUM(ti.lineTotal) AS totalSales
    FROM transaction_items ti JOIN transactions t ON t.id=ti.transactionId
    WHERE t.shiftId=? AND t.status='PAID'
    GROUP BY ti.menuId, ti.menuName
    ORDER BY quantitySold DESC`, [shiftId]);
}

export async function listShiftIngredients(database: Db, shiftId: string) {
  return await rows<any>(database, `SELECT sm.ingredientId, i.name AS ingredientName, SUM(-sm.quantity) AS quantityUsed, i.unit, i.currentStock AS remainingStock
    FROM stock_movements sm JOIN ingredients i ON i.id=sm.ingredientId JOIN transactions t ON t.id=sm.transactionId
    WHERE t.shiftId=? AND t.status='PAID' AND sm.type='SALE'
    GROUP BY sm.ingredientId, i.name, i.unit, i.currentStock
    ORDER BY quantityUsed DESC`, [shiftId]);
}

export async function closeShift(database: Db, activeShift: any, summary: any, closingCashActual: number, notes: string, closedAt: string, ids: { itemIds: string[]; ingredientIds: string[] }) {
  await exec(database, "BEGIN");
  try {
    await exec(database, "DELETE FROM shift_items_summary WHERE shiftId=?", [activeShift.id]);
    await exec(database, "DELETE FROM shift_ingredients_summary WHERE shiftId=?", [activeShift.id]);
    for (const [index, item] of summary.items.entries()) await exec(database, "INSERT INTO shift_items_summary VALUES (?, ?, ?, ?, ?, ?)", [ids.itemIds[index], activeShift.id, item.menuId, item.menuName, item.quantitySold, item.totalSales]);
    for (const [index, ingredient] of summary.ingredients.entries()) await exec(database, "INSERT INTO shift_ingredients_summary VALUES (?, ?, ?, ?, ?, ?, ?)", [ids.ingredientIds[index], activeShift.id, ingredient.ingredientId, ingredient.ingredientName, ingredient.quantityUsed, ingredient.unit, ingredient.remainingStock]);
    await exec(database, `UPDATE shifts SET
      closedAt=?, closingCashActual=?, expectedCash=?, cashDifference=?, totalSales=?, totalTransactions=?, totalItemsSold=?,
      totalCashPayment=?, totalQrisPayment=?, totalDiscount=?, totalVoided=?, notes=?, status='CLOSED', updatedAt=?
      WHERE id=?`, [closedAt, closingCashActual, summary.expectedCash, summary.cashDifference, summary.totalSales, summary.totalTransactions, summary.totalItemsSold, summary.totalCashPayment, summary.totalQrisPayment, summary.totalDiscount, summary.totalVoided, notes, closedAt, activeShift.id]);
    await exec(database, "COMMIT");
  } catch (error) {
    await exec(database, "ROLLBACK");
    throw error;
  }
}

export async function findShift(database: Db, shiftId: string) {
  return await row(database, "SELECT * FROM shifts WHERE id=?", [shiftId]);
}
