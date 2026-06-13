import { authError, requireOwner } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { listRecipes, replaceRecipe } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listRecipes());
}

export async function POST(req: Request) {
  try {
    await requireOwner();
    return ok(await replaceRecipe(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}
