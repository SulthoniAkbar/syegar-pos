import { z } from "zod";
import { db, exec, id, now, persist } from "@/lib/database";
import { AppError } from "@/lib/http";
import * as opnameRepository from "@/repositories/stock-opname.repository";

const createSchema = z.object({
  action: z.literal("create"),
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2020),
  opnameDate: z.string().min(1),
  officerId: z.string().optional(),
  officerName: z.string().optional(),
  generalNotes: z.string().optional().default("")
});
const itemSchema = z.object({
  id: z.string(),
  physicalStock: z.union([z.coerce.number().min(0), z.null()]).optional(),
  notes: z.string().optional().default("")
});
const updateSchema = z.object({
  action: z.enum(["saveDraft", "finalize"]),
  id: z.string(),
  generalNotes: z.string().optional().default(""),
  items: z.array(itemSchema)
});
const deleteSchema = z.object({ id: z.string() });

export async function listStockOpnames(idParam?: string | null) {
  const database = await db();
  if (idParam) {
    const opname = await opnameRepository.findOpname(database, idParam);
    if (!opname) throw new AppError("Stock opname tidak ditemukan", 404);
    return { ...decorateOpname(opname), items: await opnameRepository.listOpnameItems(database, idParam), adjustments: await opnameRepository.listAdjustments(database, idParam) };
  }
  return (await opnameRepository.listOpnames(database)).map(decorateOpname);
}

export async function mutateStockOpname(rawBody: unknown, user: any) {
  const body = rawBody as { action?: unknown };
  if (body.action === "create") return await createOpname(createSchema.parse(rawBody), user);
  return await updateOpname(updateSchema.parse(rawBody), user);
}

export async function deleteStockOpname(rawBody: unknown, user: any) {
  if (!["OWNER", "SUPER_ADMIN"].includes(user?.role)) throw new AppError("Hapus cek stok hanya boleh dilakukan oleh Owner atau Super Admin.", 403);
  const body = deleteSchema.parse(rawBody);
  const database = await db();
  const opname = await opnameRepository.findOpname(database, body.id);
  if (!opname) throw new AppError("Stock opname tidak ditemukan", 404);
  if (opname.status !== "DRAFT") throw new AppError("Stock opname yang sudah selesai tidak boleh dihapus.", 409);
  await opnameRepository.deleteDraft(database, body.id);
  await persist(database);
  return true;
}

async function createOpname(body: z.infer<typeof createSchema>, user: any) {
  const database = await db();
  const officerName = body.officerName || user?.name || "Petugas";
  const officerId = user?.id ?? body.officerId ?? null;
  const existingDraft = await opnameRepository.findDraftByPeriod(database, body.periodMonth, body.periodYear);
  if (existingDraft) throw new AppError("Sudah ada draft cek stok untuk periode ini.", 409);
  const ingredients = await opnameRepository.listActiveIngredients(database);
  if (!ingredients.length) throw new AppError("Belum ada bahan baku aktif untuk dicek.", 400);

  const t = now();
  const opnameId = id();
  await opnameRepository.createOpname(database, {
    id: opnameId,
    soNumber: `SO-${body.periodYear}-${String(body.periodMonth).padStart(2, "0")}-${Date.now().toString().slice(-5)}`,
    periodMonth: body.periodMonth,
    periodYear: body.periodYear,
    opnameDate: body.opnameDate,
    officerId,
    officerName,
    generalNotes: body.generalNotes,
    createdAt: t,
    updatedAt: t
  }, ingredients, ingredients.map(() => id()));
  await persist(database);
  return { ...await opnameRepository.findOpname(database, opnameId), items: await opnameRepository.listOpnameItems(database, opnameId) };
}

async function updateOpname(body: z.infer<typeof updateSchema>, user: any) {
  const database = await db();
  const opname = await opnameRepository.findOpname(database, body.id);
  if (!opname) throw new AppError("Stock opname tidak ditemukan", 404);
  if (opname.status === "SELESAI") throw new AppError("Stock opname yang sudah selesai tidak boleh diedit.", 409);
  if (body.action === "finalize" && !["OWNER", "SUPER_ADMIN"].includes(user?.role)) throw new AppError("Finalisasi cek stok hanya boleh dilakukan oleh Owner atau Super Admin.", 403);

  const itemMap = new Map(body.items.map((item) => [item.id, item]));
  const currentItems = await opnameRepository.listOpnameItems(database, body.id);
  const t = now();

  for (const item of currentItems) {
    const incoming = itemMap.get(item.id);
    const physical = incoming?.physicalStock ?? item.physicalStock;
    const notes = (incoming?.notes ?? item.notes ?? "").trim();
    if (physical != null && Number(physical) < 0) throw new AppError(`Stok fisik ${item.ingredientName} tidak boleh negatif.`);
    const diff = physical == null ? null : Number(physical) - Number(item.systemStock);
    if (diff !== null && diff !== 0 && !notes) throw new AppError(`Catatan wajib diisi untuk ${item.ingredientName} karena ada selisih.`);
    if (body.action === "finalize" && physical == null) throw new AppError(`Stok fisik ${item.ingredientName} belum diisi.`);
  }

  await updateOpnameItems(database, opname, currentItems, itemMap, body, user, t);
  await persist(database);
  return { ...decorateOpname(await opnameRepository.findOpname(database, body.id)), items: await opnameRepository.listOpnameItems(database, body.id) };
}

async function updateOpnameItems(database: opnameRepository.Db, opname: any, currentItems: any[], itemMap: Map<string, z.infer<typeof itemSchema>>, body: z.infer<typeof updateSchema>, user: any, updatedAt: string) {
  await exec(database, "BEGIN");
  try {
    for (const item of currentItems) {
      const incoming = itemMap.get(item.id);
      const physical = incoming?.physicalStock ?? item.physicalStock;
      const notes = (incoming?.notes ?? item.notes ?? "").trim();
      const diff = physical == null ? null : Number(physical) - Number(item.systemStock);
      const type = diff == null ? "BELUM" : diff === 0 ? "SESUAI" : diff > 0 ? "LEBIH" : "KURANG";
      await opnameRepository.updateItem(database, item, physical, diff, type, notes, updatedAt);
    }
    await opnameRepository.updateTotals(database, body.id, body.generalNotes, updatedAt);
    if (body.action === "finalize") {
      const finalItems = await opnameRepository.listOpnameItems(database, body.id);
      await opnameRepository.finalizeOpname(database, opname, finalItems, user?.name ?? opname.officerName, {
        adjustmentIds: finalItems.map(() => id()),
        movementIds: finalItems.map(() => id())
      }, updatedAt);
    }
    await exec(database, "COMMIT");
  } catch (error) {
    await exec(database, "ROLLBACK");
    throw error;
  }
}

function decorateOpname(opname: any) {
  return {
    ...opname,
    statusLabel: opname.status === "SELESAI" ? "Selesai" : "Draft",
    period: `${String(opname.periodMonth).padStart(2, "0")}/${opname.periodYear}`
  };
}
