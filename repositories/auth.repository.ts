import { db, exec, row, rows } from "@/lib/database";

export async function findActiveUserByUsername(username: string) {
  return await row<any>(await db(), "SELECT * FROM users WHERE username = ? AND active = 1", [username]);
}

export async function updatePasswordHash(userId: string, passwordHash: string) {
  await exec(await db(), "UPDATE users SET passwordHash=? WHERE id=?", [passwordHash, userId]);
}

export async function listUsers() {
  return await rows<any>(await db(), "SELECT id, name, username, role, active, createdAt FROM users ORDER BY active DESC, role ASC, name ASC");
}

export async function findUserById(userId: string) {
  return await row<any>(await db(), "SELECT id, name, username, role, active, createdAt FROM users WHERE id=?", [userId]);
}

export async function findUserByUsername(username: string) {
  return await row<any>(await db(), "SELECT id, username FROM users WHERE username=?", [username]);
}

export async function createUser(user: { id: string; name: string; username: string; passwordHash: string; role: string; active: number; createdAt: string }) {
  await exec(await db(), "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)", [user.id, user.name, user.username, user.passwordHash, user.role, user.active, user.createdAt]);
}

export async function updateUser(user: { id: string; name: string; username: string; role: string; active: number; passwordHash?: string }) {
  if (user.passwordHash) {
    await exec(await db(), "UPDATE users SET name=?, username=?, role=?, active=?, passwordHash=? WHERE id=?", [user.name, user.username, user.role, user.active, user.passwordHash, user.id]);
    return;
  }
  await exec(await db(), "UPDATE users SET name=?, username=?, role=?, active=? WHERE id=?", [user.name, user.username, user.role, user.active, user.id]);
}
