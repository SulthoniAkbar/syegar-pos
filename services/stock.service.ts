import { z } from "zod";
import { audit } from "@/lib/audit";
import { db, id, now, persist } from "@/lib/database";
import { AppError } from "@/lib/http";
import * as stockRepository from "@/repositories/stock.repository";
import type { StockUser } from "@/types/stock";

const stockPurchaseSchema = z.object({
  ingredientId: z.string(),
  quantity: z.coerce.number().positive(),
  purchaseAmount: z.coerce.number().int().min(0).optional().default(0),
  paymentMethod: z.enum(["TUNAI", "QRIS", "TRANSFER"]).optional().default("TUNAI"),
  supplier: z.string().optional().default(""),
  note: z.string().optional().default("")
});

export async function listStockPurchases() {
  return await stockRepository.listStockPurchases();
}

export async function createStockPurchase(rawBody: unknown, user: StockUser) {
  const body = stockPurchaseSchema.parse(rawBody);
  const ingredient = await stockRepository.findActiveIngredient(body.ingredientId);
  if (!ingredient) throw new AppError("Bahan tidak ditemukan atau nonaktif", 404);

  const t = now();
  const purchaseId = id();
  const stockBefore = Number(ingredient.currentStock);
  const stockAfter = stockBefore + body.quantity;

  await stockRepository.createStockPurchase({
    purchaseId,
    adjustmentId: id(),
    movementId: id(),
    ingredient,
    quantity: body.quantity,
    purchaseAmount: body.purchaseAmount,
    paymentMethod: body.paymentMethod,
    stockBefore,
    stockAfter,
    supplier: body.supplier,
    note: body.note,
    createdBy: user.name,
    createdAt: t,
    expenseId: body.purchaseAmount > 0 ? id() : null,
    ledgerId: body.purchaseAmount > 0 ? id() : null
  });

  const database = await db();
  await audit(database, user, "CREATE_STOCK_PURCHASE", "stock_purchases", purchaseId, { ingredient: ingredient.name, quantity: body.quantity, purchaseAmount: body.purchaseAmount });
  await persist(database);
  return { id: purchaseId, stockAfter, expenseCreated: body.purchaseAmount > 0 };
}
