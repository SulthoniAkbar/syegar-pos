import { db, exec, row, rows, scalar } from "@/lib/database";

export type Db = Awaited<ReturnType<typeof db>>;

export async function findOpname(database: Db, id: string) {
  return await row<any>(database, "SELECT * FROM stock_opnames WHERE id=?", [id]);
}

export async function listOpnames(database: Db) {
  return await rows<any>(database, "SELECT * FROM stock_opnames ORDER BY createdAt DESC LIMIT 300");
}

export async function listOpnameItems(database: Db, opnameId: string) {
  return await rows<any>(database, "SELECT * FROM stock_opname_items WHERE stockOpnameId=? ORDER BY ingredientName ASC", [opnameId]);
}

export async function listAdjustments(database: Db, opnameId: string) {
  return await rows(database, "SELECT * FROM stock_adjustments WHERE stockOpnameId=? ORDER BY createdAt DESC", [opnameId]);
}

export async function findDraftByPeriod(database: Db, periodMonth: number, periodYear: number) {
  return await row(database, "SELECT id FROM stock_opnames WHERE periodMonth=? AND periodYear=? AND status='DRAFT'", [periodMonth, periodYear]);
}

export async function listActiveIngredients(database: Db) {
  return await rows<any>(database, "SELECT id, name, unit, currentStock FROM ingredients WHERE active=1 ORDER BY name ASC");
}

export async function createOpname(database: Db, data: any, ingredients: any[], itemIds: string[]) {
  await exec(database, "BEGIN");
  try {
    await exec(database, "INSERT INTO stock_opnames VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      data.id, data.soNumber, data.periodMonth, data.periodYear, data.opnameDate, data.officerId, data.officerName, data.generalNotes, ingredients.length, 0, 0, "DRAFT", null, data.createdAt, data.updatedAt
    ]);
    for (const [index, ingredient] of ingredients.entries()) await exec(database, "INSERT INTO stock_opname_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      itemIds[index], data.id, ingredient.id, ingredient.name, ingredient.unit, ingredient.currentStock, null, null, "BELUM", "", data.createdAt, data.updatedAt
    ]);
    await exec(database, "COMMIT");
  } catch (error) {
    await exec(database, "ROLLBACK");
    throw error;
  }
}

export async function deleteDraft(database: Db, id: string) {
  await exec(database, "BEGIN");
  try {
    await exec(database, "DELETE FROM stock_opname_items WHERE stockOpnameId=?", [id]);
    await exec(database, "DELETE FROM stock_opnames WHERE id=?", [id]);
    await exec(database, "COMMIT");
  } catch (error) {
    await exec(database, "ROLLBACK");
    throw error;
  }
}

export async function updateItem(database: Db, item: any, physical: number | null, diff: number | null, type: string, notes: string, updatedAt: string) {
  await exec(database, "UPDATE stock_opname_items SET physicalStock=?, difference=?, differenceType=?, notes=?, updatedAt=? WHERE id=?", [physical, diff, type, notes, updatedAt, item.id]);
}

export async function updateTotals(database: Db, opnameId: string, generalNotes: string, updatedAt: string) {
  const totalItems = await scalar<number>(database, "SELECT COUNT(*) FROM stock_opname_items WHERE stockOpnameId=?", [opnameId]) ?? 0;
  const totalMinus = await scalar<number>(database, "SELECT COALESCE(SUM(ABS(difference)),0) FROM stock_opname_items WHERE stockOpnameId=? AND difference < 0", [opnameId]) ?? 0;
  const totalPlus = await scalar<number>(database, "SELECT COALESCE(SUM(difference),0) FROM stock_opname_items WHERE stockOpnameId=? AND difference > 0", [opnameId]) ?? 0;
  await exec(database, "UPDATE stock_opnames SET totalItems=?, totalMinusDifference=?, totalPlusDifference=?, generalNotes=?, updatedAt=? WHERE id=?", [totalItems, totalMinus, totalPlus, generalNotes, updatedAt, opnameId]);
}

export async function finalizeOpname(database: Db, opname: any, items: any[], userName: string, ids: { adjustmentIds: string[]; movementIds: string[] }, finalizedAt: string) {
  for (const [index, item] of items.entries()) {
    await exec(database, "UPDATE ingredients SET currentStock=?, updatedAt=? WHERE id=?", [item.physicalStock, finalizedAt, item.ingredientId]);
    await exec(database, "INSERT INTO stock_adjustments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      ids.adjustmentIds[index], item.ingredientId, opname.id, "STOCK_OPNAME", item.systemStock, item.physicalStock, item.difference ?? 0, item.notes ?? "", userName, finalizedAt
    ]);
    if ((item.difference ?? 0) !== 0) {
      await exec(database, "INSERT INTO stock_movements VALUES (?, ?, ?, ?, ?, ?, ?)", [ids.movementIds[index], item.ingredientId, "OPNAME", item.difference, `Cek Stok ${opname.soNumber}`, null, finalizedAt]);
    }
  }
  await exec(database, "UPDATE stock_opnames SET status='SELESAI', finalizedAt=?, updatedAt=? WHERE id=?", [finalizedAt, finalizedAt, opname.id]);
}
