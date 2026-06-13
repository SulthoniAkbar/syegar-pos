import { setSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { login } from "@/services/auth.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await login(await req.json());
    setSession(user.id);
    return ok(user);
  } catch (error) {
    return handleError(error);
  }
}
