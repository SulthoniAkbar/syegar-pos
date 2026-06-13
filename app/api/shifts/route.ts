import { currentUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { getShiftDashboard, mutateShift } from "@/services/shift.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await getShiftDashboard(await currentUser()));
}

export async function POST(req: Request) {
  try {
    return ok(await mutateShift(await req.json(), await currentUser()));
  } catch (error) {
    return handleError(error);
  }
}
