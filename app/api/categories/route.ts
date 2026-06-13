import { authError, requireOwner } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { createCategory, deleteCategory, listCategories, updateCategory } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listCategories());
}

export async function POST(req: Request) {
  try {
    await requireOwner();
    return ok(await createCategory(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function PUT(req: Request) {
  try {
    await requireOwner();
    return ok(await updateCategory(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireOwner();
    return ok(await deleteCategory(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}
