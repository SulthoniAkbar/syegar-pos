import { authError, currentUser, requireOwner } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { createTransaction, listRecentTransactions, voidTransaction } from "@/services/kasir.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listRecentTransactions());
}

export async function POST(req: Request) {
  try {
    return ok(await createTransaction(await req.json(), await currentUser()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireOwner();
    return ok(await voidTransaction(await req.json(), user));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}
