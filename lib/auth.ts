import { cookies } from "next/headers";
import { db, hashPassword, row } from "@/lib/database";
import { fail } from "@/lib/http";

export { hashPassword };

export async function currentUser() {
  const id = cookies().get("syegar_user_id")?.value;
  if (!id) return null;
  return await row(await db(), "SELECT id, name, username, role FROM users WHERE id = ? AND active = 1", [id]);
}

export function setSession(userId: string) {
  cookies().set("syegar_user_id", userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 18
  });
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("LOGIN_REQUIRED");
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (!["OWNER", "SUPER_ADMIN"].includes(user.role)) throw new Error("OWNER_REQUIRED");
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") throw new Error("SUPER_ADMIN_REQUIRED");
  return user;
}

export function authError(error: unknown) {
  if (error instanceof Error && error.message === "LOGIN_REQUIRED") return fail("Silakan login terlebih dahulu.", 401);
  if (error instanceof Error && error.message === "OWNER_REQUIRED") return fail("Aksi ini hanya boleh dilakukan oleh Owner atau Super Admin.", 403);
  if (error instanceof Error && error.message === "SUPER_ADMIN_REQUIRED") return fail("Aksi ini hanya boleh dilakukan oleh Super Admin.", 403);
  return null;
}
