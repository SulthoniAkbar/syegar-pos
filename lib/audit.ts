import { exec, id, now } from "@/lib/database";
import type { Database } from "@/lib/database";

export async function audit(database: Database, user: any, action: string, entity: string, entityId?: string | null, details?: unknown) {
  await exec(database, "INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    id(),
    user?.id ?? null,
    user?.name ?? null,
    action,
    entity,
    entityId ?? null,
    details == null ? null : JSON.stringify(details),
    now()
  ]);
}
