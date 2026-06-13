import { z } from "zod";
import { db, hashPassword, id, now, persist } from "@/lib/database";
import { AppError } from "@/lib/http";
import * as authRepository from "@/repositories/auth.repository";

const roleSchema = z.enum(["SUPER_ADMIN", "OWNER", "KASIR"]);
const createSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  username: z.string().trim().min(3, "Username minimal 3 karakter").regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, garis bawah, dan strip"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: roleSchema,
  active: z.boolean().default(true)
});
const updateSchema = createSchema.extend({
  id: z.string(),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal(""))
});

export async function listUsers() {
  return (await authRepository.listUsers()).map(toUserDto);
}

export async function createUser(rawBody: unknown) {
  const body = createSchema.parse(rawBody);
  const username = body.username.toLowerCase();
  if (await authRepository.findUserByUsername(username)) throw new AppError("Username sudah dipakai.", 409);
  await authRepository.createUser({
    id: id(),
    name: body.name,
    username,
    passwordHash: hashPassword(body.password),
    role: body.role,
    active: body.active ? 1 : 0,
    createdAt: now()
  });
  await persist(await db());
  return true;
}

export async function updateUser(rawBody: unknown, currentUser: any) {
  const body = updateSchema.parse(rawBody);
  const existing = await authRepository.findUserById(body.id);
  if (!existing) throw new AppError("User tidak ditemukan.", 404);
  if (body.id === currentUser?.id && (!body.active || body.role !== "SUPER_ADMIN")) {
    throw new AppError("Super Admin tidak boleh menonaktifkan atau menurunkan role akun sendiri.", 409);
  }
  const username = body.username.toLowerCase();
  const usernameOwner = await authRepository.findUserByUsername(username);
  if (usernameOwner && usernameOwner.id !== body.id) throw new AppError("Username sudah dipakai.", 409);
  await authRepository.updateUser({
    id: body.id,
    name: body.name,
    username,
    role: body.role,
    active: body.active ? 1 : 0,
    passwordHash: body.password ? hashPassword(body.password) : undefined
  });
  await persist(await db());
  return true;
}

export async function deactivateUser(rawBody: unknown, currentUser: any) {
  const body = z.object({ id: z.string() }).parse(rawBody);
  if (body.id === currentUser?.id) throw new AppError("Tidak bisa menonaktifkan akun sendiri.", 409);
  const existing = await authRepository.findUserById(body.id);
  if (!existing) throw new AppError("User tidak ditemukan.", 404);
  await authRepository.updateUser({ id: body.id, name: existing.name, username: existing.username, role: existing.role, active: 0 });
  await persist(await db());
  return true;
}

function toUserDto(user: any) {
  return {
    ...user,
    active: Boolean(user.active)
  };
}
