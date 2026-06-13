import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/http";

const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg"
};

export async function uploadMenuImage(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("File gambar belum dipilih");
  if (!allowedTypes[file.type]) throw new AppError("Format gambar harus JPG, PNG, WEBP, atau SVG");
  if (file.size > 2 * 1024 * 1024) throw new AppError("Ukuran gambar maksimal 2 MB");

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filename = `menu-${Date.now()}-${randomUUID()}.${allowedTypes[file.type]}`;
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${filename}` };
}
