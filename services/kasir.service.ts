import { z } from "zod";
import { audit } from "@/lib/audit";
import { db, id, now, persist } from "@/lib/database";
import { AppError } from "@/lib/http";
import * as kasirRepository from "@/repositories/kasir.repository";
import type { KasirUser, TransactionMenu } from "@/types/kasir";

const transactionSchema = z.object({
  cashierId: z.string().optional(),
  paymentMethod: z.enum(["TUNAI", "QRIS"]),
  cashReceived: z.coerce.number().int().optional().nullable(),
  items: z.array(z.object({
    menuId: z.string(),
    quantity: z.coerce.number().int().positive(),
    options: z.array(z.object({ optionId: z.string().optional(), optionName: z.string(), extraPrice: z.coerce.number().int().min(0) })).default([])
  })).min(1)
});

const voidTransactionSchema = z.object({ id: z.string(), reason: z.string().min(3) });

export async function listRecentTransactions() {
  return await kasirRepository.listRecentTransactions();
}

export async function createTransaction(rawBody: unknown, currentUser: KasirUser | null) {
  const body = transactionSchema.parse(rawBody);
  const cashierId = currentUser?.id ?? body.cashierId;
  if (!cashierId) throw new AppError("Kasir belum login", 401);

  const cashier = await kasirRepository.findActiveCashier(cashierId);
  if (!cashier) throw new AppError("Kasir tidak ditemukan atau nonaktif", 404);

  const activeShift = await kasirRepository.findActiveShift(cashierId);
  if (!activeShift) throw new AppError("Belum ada kasir aktif. Mulai kasir terlebih dahulu di halaman Tutup Kasir.", 409);

  const stockNeeds = new Map<string, number>();
  const cart: Array<{ menu: TransactionMenu; quantity: number; unitPrice: number; options: typeof body.items[number]["options"] }> = [];
  let total = 0;

  for (const item of body.items) {
    const menu = await kasirRepository.findActiveMenu(item.menuId);
    if (!menu) throw new AppError("Menu tidak ditemukan atau nonaktif");
    const optionTotal = item.options.reduce((sum, option) => sum + option.extraPrice, 0);
    total += (menu.price + optionTotal) * item.quantity;
    cart.push({ menu, quantity: item.quantity, options: item.options, unitPrice: menu.price + optionTotal });
    for (const recipe of await kasirRepository.listMenuRecipes(menu.id)) {
      stockNeeds.set(recipe.ingredientId, (stockNeeds.get(recipe.ingredientId) ?? 0) + recipe.quantity * item.quantity);
    }
  }

  if (body.paymentMethod === "TUNAI" && (body.cashReceived ?? 0) < total) throw new AppError("Uang diterima kurang dari total belanja");
  for (const [ingredientId, quantity] of stockNeeds) {
    const ingredient = await kasirRepository.findIngredientStock(ingredientId);
    if (!ingredient || ingredient.currentStock < quantity) throw new AppError(`Stok ${ingredient?.name ?? "bahan"} tidak cukup`);
  }

  const transactionId = id();
  const receiptNumber = `SYG-${Date.now()}`;
  const t = now();

  await kasirRepository.createPaidTransaction({
    id: transactionId,
    receiptNumber,
    cashierId,
    shiftId: activeShift.id,
    paymentMethod: body.paymentMethod,
    total,
    cashReceived: body.paymentMethod === "TUNAI" ? body.cashReceived ?? 0 : null,
    changeAmount: body.paymentMethod === "TUNAI" ? (body.cashReceived ?? 0) - total : null,
    paidAt: t,
    items: cart.map((item) => ({
      id: id(),
      menuId: item.menu.id,
      menuName: item.menu.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.unitPrice * item.quantity,
      options: item.options.map((option) => ({ id: id(), optionId: option.optionId ?? null, optionName: option.optionName, extraPrice: option.extraPrice }))
    })),
    stockMovements: Array.from(stockNeeds.entries()).map(([ingredientId, quantity]) => ({ id: id(), ingredientId, quantity, note: receiptNumber, transactionId, createdAt: t }))
  });

  await persist(await db());
  return { id: transactionId, receiptNumber, total };
}

export async function voidTransaction(rawBody: unknown, user: KasirUser) {
  const body = voidTransactionSchema.parse(rawBody);
  const transaction = await kasirRepository.findTransaction(body.id);
  if (!transaction) throw new AppError("Transaksi tidak ditemukan", 404);
  if (transaction.status === "VOID") throw new AppError("Transaksi sudah dibatalkan", 409);

  const movements = await kasirRepository.listSaleMovements(body.id);
  const t = now();
  await kasirRepository.voidTransaction({
    transactionId: body.id,
    reason: body.reason,
    updatedAt: t,
    movements: movements.map((movement) => ({ id: id(), ingredientId: movement.ingredientId, quantity: Math.abs(Number(movement.quantity)) }))
  });
  const database = await db();
  await audit(database, user, "VOID_TRANSACTION", "transactions", body.id, { receiptNumber: transaction.receiptNumber, reason: body.reason });
  await persist(database);
  return true;
}
