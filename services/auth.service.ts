import { z } from "zod";
import { db, hashPassword, persist, verifyPassword } from "@/lib/database";
import { AppError } from "@/lib/http";
import * as authRepository from "@/repositories/auth.repository";

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

export async function login(rawBody: unknown) {
  const body = loginSchema.parse(rawBody);
  const user = await authRepository.findActiveUserByUsername(body.username);
  if (!user || !verifyPassword(body.password, user.passwordHash)) throw new AppError("Username atau password salah", 401);
  if (!user.passwordHash.startsWith("pbkdf2$")) {
    await authRepository.updatePasswordHash(user.id, hashPassword(body.password));
    await persist(await db());
  }
  return { id: user.id, name: user.name, role: user.role };
}
