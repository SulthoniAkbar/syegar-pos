import { authError, requireOwner } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { createIngredient, deleteIngredient, listIngredients, updateIngredient } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listIngredients());
}

export async function POST(req: Request) {
  try {
    await requireOwner();
    return ok(await createIngredient(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function PUT(req: Request) {
  try {
    await requireOwner();
    return ok(await updateIngredient(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireOwner();
    return ok(await deleteIngredient(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}
