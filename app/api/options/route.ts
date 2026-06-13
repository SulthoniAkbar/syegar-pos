import { authError, requireOwner } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { createOption, deleteOption, listOptionGroups, updateOption } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listOptionGroups());
}

export async function POST(req: Request) {
  try {
    await requireOwner();
    return ok(await createOption(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function PUT(req: Request) {
  try {
    await requireOwner();
    return ok(await updateOption(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireOwner();
    return ok(await deleteOption(await req.json()));
  } catch (error) {
    const auth = authError(error);
    if (auth) return auth;
    return handleError(error);
  }
}
