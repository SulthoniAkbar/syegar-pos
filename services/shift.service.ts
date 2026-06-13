import { z } from "zod";
import { db, id, now, persist } from "@/lib/database";
import { AppError } from "@/lib/http";
import * as shiftRepository from "@/repositories/shift.repository";

const openSchema = z.object({
  action: z.literal("open"),
  cashierId: z.string().optional(),
  openingCash: z.coerce.number().int().min(0)
});
const closeSchema = z.object({
  action: z.literal("close"),
  closingCashActual: z.coerce.number().int().min(0),
  notes: z.string().optional().default("")
});

export async function getShiftDashboard(user: any) {
  const database = await db();
  const activeShift = await shiftRepository.getActiveShift(database, user?.id);
  const latestClosed = await shiftRepository.getLatestClosedShift(database);
  const targetShift = activeShift ?? latestClosed;
  return {
    activeShift: activeShift ? decorateShift(activeShift) : null,
    summary: targetShift ? await buildSummary(database, targetShift.id, targetShift) : null,
    history: (await shiftRepository.listShiftHistory(database)).map(decorateShift)
  };
}

export async function mutateShift(rawBody: any, user: any) {
  if (rawBody.action === "open") return await openShift(openSchema.parse(rawBody), user);
  if (rawBody.action === "close") return await closeShift(closeSchema.parse(rawBody), user);
  throw new AppError("Aksi shift tidak dikenal", 422);
}

async function openShift(body: z.infer<typeof openSchema>, user: any) {
  const cashierId = user?.id ?? body.cashierId;
  if (!cashierId) throw new AppError("Kasir belum login", 401);
  const database = await db();
  const cashier = await shiftRepository.findActiveCashier(database, cashierId);
  if (!cashier) throw new AppError("Kasir tidak ditemukan atau nonaktif", 404);
  if (await shiftRepository.getActiveShift(database, cashierId)) throw new AppError("Masih ada shift aktif untuk kasir ini. Tutup shift tersebut sebelum membuka shift baru.", 409);

  const t = now();
  const shift = {
    id: id(),
    cashierId,
    openedAt: t,
    closedAt: "",
    openingCash: body.openingCash,
    closingCashActual: null,
    expectedCash: null,
    cashDifference: null,
    totalSales: 0,
    totalTransactions: 0,
    totalItemsSold: 0,
    totalCashPayment: 0,
    totalQrisPayment: 0,
    totalDiscount: 0,
    totalVoided: 0,
    notes: null,
    status: "ACTIVE",
    createdAt: t,
    updatedAt: t
  };
  await shiftRepository.insertShift(database, shift);
  await persist(database);
  return { shift: decorateShift({ ...shift, cashierName: cashier.name }), summary: await buildSummary(database, shift.id, { ...shift, cashierName: cashier.name }) };
}

async function closeShift(body: z.infer<typeof closeSchema>, user: any) {
  const database = await db();
  const activeShift = await shiftRepository.getActiveShift(database, user?.id);
  if (!activeShift) throw new AppError("Tidak ada shift aktif untuk ditutup.", 409);
  const summary = await buildSummary(database, activeShift.id, activeShift, body.closingCashActual);
  if (summary.cashDifference !== 0 && !body.notes.trim()) throw new AppError("Catatan wajib diisi jika ada selisih kas.", 422);

  const t = now();
  await shiftRepository.closeShift(database, activeShift, summary, body.closingCashActual, body.notes.trim(), t, {
    itemIds: summary.items.map(() => id()),
    ingredientIds: summary.ingredients.map(() => id())
  });
  await persist(database);
  return { shift: await shiftRepository.findShift(database, activeShift.id), summary: await buildSummary(database, activeShift.id, { ...activeShift, status: "CLOSED" }, body.closingCashActual) };
}

function decorateShift(shift: any) {
  return {
    ...shift,
    cashier: { name: shift.cashierName },
    statusLabel: shift.status === "ACTIVE" ? "Aktif" : "Ditutup"
  };
}

async function buildSummary(database: shiftRepository.Db, shiftId: string, shift: any, closingCashActual?: number) {
  const numbers = await shiftRepository.getSummaryNumbers(database, shiftId);
  const openingCash = Number(shift.openingCash ?? 0);
  const expectedCash = openingCash + numbers.totalCashPayment;
  const actual = closingCashActual ?? (shift.closingCashActual == null ? null : Number(shift.closingCashActual));
  const cashDifference = actual == null ? null : actual - expectedCash;
  const cashStatus = cashDifference == null ? "Belum dihitung" : cashDifference === 0 ? "Sesuai" : cashDifference > 0 ? "Lebih" : "Kurang";

  return {
    shift: decorateShift(shift),
    ...numbers,
    totalDiscount: 0,
    totalPayment: numbers.totalCashPayment + numbers.totalQrisPayment,
    openingCash,
    closingCashActual: actual,
    expectedCash,
    cashDifference,
    cashStatus,
    items: await shiftRepository.listShiftItems(database, shiftId),
    ingredients: await shiftRepository.listShiftIngredients(database, shiftId)
  };
}
