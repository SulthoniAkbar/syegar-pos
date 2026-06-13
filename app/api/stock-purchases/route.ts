import { authError, requireOwner } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { createStockPurchase, listStockPurchases } from "@/services/stock.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listStockPurchases());
}

export async function POST(req: Request) {
  try {
    const user = await requireOwner();
    return ok(await createStockPurchase(await req.json(), user));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}
