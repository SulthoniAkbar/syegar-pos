import { ok } from "@/lib/http";
import { getReports } from "@/services/analytics.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  return ok(await getReports(url.searchParams.get("from") || "0000-01-01", url.searchParams.get("to") || "9999-12-31"));
}
