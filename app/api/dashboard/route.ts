import { ok } from "@/lib/http";
import { getDashboard } from "@/services/analytics.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  return ok(await getDashboard({
    chartMode: url.searchParams.get("chart") ?? "monthly",
    year: url.searchParams.get("year")
  }));
}
