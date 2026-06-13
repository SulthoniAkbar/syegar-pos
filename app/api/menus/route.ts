import { authError, requireOwner } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { createMenu, deleteMenu, listMenus, updateMenu } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listMenus());
}

export async function POST(req: Request) {
  try {
    await requireOwner();
    return ok(await createMenu(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function PUT(req: Request) {
  try {
    await requireOwner();
    return ok(await updateMenu(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireOwner();
    return ok(await deleteMenu(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}
