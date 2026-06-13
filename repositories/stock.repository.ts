import { db, exec, row, rows } from "@/lib/database";
import type { IngredientRow } from "@/types/stock";

export async function listStockPurchases() {
  return await rows(await db(), "SELECT * FROM stock_purchases ORDER BY createdAt DESC LIMIT 200");
}

export async function findActiveIngredient(ingredientId: string) {
  return await row<IngredientRow>(await db(), "SELECT * FROM ingredients WHERE id=? AND active=1", [ingredientId]);
}

export async function createStockPurchase(data: {
  purchaseId: string;
  adjustmentId: string;
  movementId: string;
  ingredient: IngredientRow;
  quantity: number;
  purchaseAmount: number;
  paymentMethod: string;
  stockBefore: number;
  stockAfter: number;
  supplier: string;
  note: string;
  createdBy: string;
  createdAt: string;
  expenseId: string | null;
  ledgerId: string | null;
}) {
  const database = await db();
  await exec(database, "BEGIN");
  try {
    await exec(database, "UPDATE ingredients SET currentStock=?, updatedAt=? WHERE id=?", [data.stockAfter, data.createdAt, data.ingredient.id]);
    await exec(database, "INSERT INTO stock_purchases (id, ingredientId, ingredientName, unit, quantity, stockBefore, stockAfter, supplier, note, createdBy, createdAt, purchaseAmount, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.purchaseId, data.ingredient.id, data.ingredient.name, data.ingredient.unit, data.quantity, data.stockBefore, data.stockAfter, data.supplier, data.note, data.createdBy, data.createdAt, data.purchaseAmount, data.paymentMethod]);
    await exec(database, "INSERT INTO stock_adjustments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.adjustmentId, data.ingredient.id, null, "STOCK_IN", data.stockBefore, data.stockAfter, data.quantity, data.note || data.supplier || "Stok masuk", data.createdBy, data.createdAt]);
    await exec(database, "INSERT INTO stock_movements VALUES (?, ?, ?, ?, ?, ?, ?)", [data.movementId, data.ingredient.id, "STOCK_IN", data.quantity, data.note || "Stok masuk", null, data.createdAt]);
    if (data.purchaseAmount > 0 && data.expenseId && data.ledgerId) {
      const expenseDate = data.createdAt.slice(0, 10);
      const note = data.note || `Pembelian ${data.ingredient.name}${data.supplier ? ` dari ${data.supplier}` : ""}`;
      await exec(database, "INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.expenseId, expenseDate, "Belanja Bahan", data.supplier, data.purchaseAmount, data.paymentMethod, note, data.createdBy, data.createdAt, data.createdAt]);
      await exec(database, "INSERT INTO cash_ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.ledgerId, "CASH_OUT", "EXPENSE", data.expenseId, `Pengeluaran: Belanja Bahan`, data.purchaseAmount, note, expenseDate, data.createdBy, data.createdAt, data.createdAt]);
    }
    await exec(database, "COMMIT");
  } catch (error) {
    await exec(database, "ROLLBACK");
    throw error;
  }
}
