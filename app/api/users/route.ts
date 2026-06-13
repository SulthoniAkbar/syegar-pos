import { authError, requireSuperAdmin } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { createUser, deactivateUser, listUsers, updateUser } from "@/services/user.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    return ok(await listUsers());
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    return ok(await createUser(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireSuperAdmin();
    return ok(await updateUser(await req.json(), user));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireSuperAdmin();
    return ok(await deactivateUser(await req.json(), user));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}
