import { currentUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { deleteStockOpname, listStockOpnames, mutateStockOpname } from "@/services/stock-opname.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  return ok(await listStockOpnames(url.searchParams.get("id")));
}

export async function POST(req: Request) {
  try {
    return ok(await mutateStockOpname(await req.json(), await currentUser()));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    return ok(await deleteStockOpname(await req.json(), await currentUser()));
  } catch (error) {
    return handleError(error);
  }
}
