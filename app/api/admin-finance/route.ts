import { authError, requireOwner } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { getAdminFinanceDashboard, mutateAdminFinance } from "@/services/finance.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireOwner();
    return ok(await getAdminFinanceDashboard());
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireOwner();
    return ok(await mutateAdminFinance(await req.json(), user));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}
