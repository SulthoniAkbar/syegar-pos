import { cookies } from "next/headers";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  cookies().delete("syegar_user_id");
  return ok(true);
}
